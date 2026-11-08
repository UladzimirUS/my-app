package com.uladzimirus.flashlight

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import kotlin.math.roundToInt

/** Back-camera torch with optional brightness (Android 13+, if the hardware supports it). */
class Torch(context: Context) {
    private val app = context.applicationContext
    private val cm = app.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    private val prefs = app.getSharedPreferences("torch", Context.MODE_PRIVATE)

    val cameraId: String? = runCatching {
        val withFlash = cm.cameraIdList.filter {
            cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
        withFlash.firstOrNull {
            cm.getCameraCharacteristics(it).get(CameraCharacteristics.LENS_FACING) ==
                CameraCharacteristics.LENS_FACING_BACK
        } ?: withFlash.firstOrNull()
    }.getOrNull()

    /** Hardware strength levels; 1 means brightness can't be adjusted. */
    val maxStrength: Int = if (Build.VERSION.SDK_INT >= 33 && cameraId != null) {
        runCatching {
            cm.getCameraCharacteristics(cameraId)
                .get(CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL) ?: 1
        }.getOrDefault(1)
    } else 1

    val hasFlash get() = cameraId != null
    val canDim get() = maxStrength > 1

    var isOn = false
        private set

    /** UI level 1..STEPS, persisted. */
    var level: Int
        get() = prefs.getInt(KEY_LEVEL, STEPS).coerceIn(1, STEPS)
        set(value) {
            prefs.edit().putInt(KEY_LEVEL, value.coerceIn(1, STEPS)).apply()
            if (isOn) setOn(true)
        }

    fun setOn(on: Boolean): Boolean {
        val id = cameraId ?: return false
        return runCatching {
            if (on && canDim && Build.VERSION.SDK_INT >= 33) {
                val strength = (level * maxStrength / STEPS.toFloat()).roundToInt().coerceIn(1, maxStrength)
                cm.turnOnTorchWithStrengthLevel(id, strength)
            } else {
                cm.setTorchMode(id, on)
            }
            isOn = on
            true
        }.getOrDefault(false)
    }

    fun toggle() = setOn(!isOn)

    private val main = Handler(Looper.getMainLooper())
    private var listener: ((Boolean) -> Unit)? = null
    private val callback = object : CameraManager.TorchCallback() {
        override fun onTorchModeChanged(id: String, enabled: Boolean) {
            if (id != cameraId) return
            isOn = enabled
            listener?.invoke(enabled)
        }

        override fun onTorchModeUnavailable(id: String) {
            if (id != cameraId) return
            isOn = false
            listener?.invoke(false)
        }
    }

    /** Callback fires immediately with the current state. */
    fun listen(onChange: (Boolean) -> Unit) {
        listener = onChange
        cm.registerTorchCallback(callback, main)
    }

    fun stopListening() {
        listener = null
        cm.unregisterTorchCallback(callback)
    }

    companion object {
        const val STEPS = 5
        private const val KEY_LEVEL = "level"
    }
}
