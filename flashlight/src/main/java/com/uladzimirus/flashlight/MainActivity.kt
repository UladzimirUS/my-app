package com.uladzimirus.flashlight

import android.app.StatusBarManager
import android.content.ComponentName
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.slider.Slider

class MainActivity : AppCompatActivity() {
    private lateinit var torch: Torch

    private lateinit var content: View
    private lateinit var power: FrameLayout
    private lateinit var glyph: ImageView
    private lateinit var status: TextView
    private lateinit var panel: View
    private lateinit var switchLabel: TextView
    private lateinit var torchSwitch: MaterialSwitch
    private lateinit var slider: Slider
    private lateinit var sliderNote: TextView

    private var syncing = false

    /** Launcher icon tap toggles the torch right away (one tap). */
    private var pendingToggle = false

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        torch = Torch(this)

        content = findViewById(R.id.content)
        power = findViewById(R.id.power)
        glyph = findViewById(R.id.glyph)
        status = findViewById(R.id.status)
        panel = findViewById(R.id.panel)
        switchLabel = findViewById(R.id.switch_label)
        torchSwitch = findViewById(R.id.torch_switch)
        slider = findViewById(R.id.slider)
        sliderNote = findViewById(R.id.slider_note)

        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        power.setOnClickListener {
            it.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            if (!torch.toggle()) failed()
            render()
        }
        findViewById<View>(R.id.settings).setOnClickListener { showPanel(true) }
        findViewById<Button>(R.id.done).setOnClickListener { showPanel(false) }
        panel.setOnClickListener { /* swallow taps behind the card */ }

        torchSwitch.setOnCheckedChangeListener { _, checked ->
            if (syncing) return@setOnCheckedChangeListener
            if (!torch.setOn(checked)) failed()
            render()
        }

        slider.valueFrom = 1f
        slider.valueTo = Torch.STEPS.toFloat()
        slider.stepSize = 1f
        slider.value = torch.level.toFloat()
        slider.isEnabled = torch.canDim
        sliderNote.visibility = if (torch.canDim) View.GONE else View.VISIBLE
        slider.addOnChangeListener { s, value, fromUser ->
            if (!fromUser) return@addOnChangeListener
            s.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            torch.level = value.toInt()
        }

        val addTile = findViewById<Button>(R.id.add_tile)
        if (Build.VERSION.SDK_INT >= 33) {
            addTile.visibility = View.VISIBLE
            addTile.setOnClickListener { requestTile() }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (panel.visibility == View.VISIBLE) showPanel(false) else finish()
            }
        })

        val openPanel = savedInstanceState?.getBoolean(STATE_PANEL)
            ?: (intent?.action == ACTION_QS_PREFS)
        showPanel(openPanel, animate = false)
        pendingToggle = savedInstanceState == null && intent?.action == Intent.ACTION_MAIN

        if (!torch.hasFlash) {
            status.setText(R.string.no_flash)
            power.isEnabled = false
            torchSwitch.isEnabled = false
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action == ACTION_QS_PREFS) showPanel(true)
        if (intent.action == Intent.ACTION_MAIN) pendingToggle = true
    }

    override fun onStart() {
        super.onStart()
        // The callback reports the real torch state first, then we toggle from it.
        torch.listen {
            if (pendingToggle) {
                pendingToggle = false
                if (!torch.toggle()) failed()
            }
            render()
        }
        render()
    }

    override fun onStop() {
        torch.stopListening()
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(STATE_PANEL, panel.visibility == View.VISIBLE)
    }

    private fun render() {
        val on = torch.isOn
        power.backgroundTintList = ColorStateList.valueOf(
            ContextCompat.getColor(this, if (on) R.color.button_on else R.color.button_off)
        )
        glyph.imageTintList = ColorStateList.valueOf(
            ContextCompat.getColor(this, if (on) R.color.glyph_on else R.color.glyph_off)
        )
        content.setBackgroundResource(if (on) R.drawable.bg_main_on else R.drawable.bg_main)
        if (torch.hasFlash) status.setText(if (on) R.string.on else R.string.off)
        power.contentDescription = getString(if (on) R.string.turn_off else R.string.turn_on)

        syncing = true
        torchSwitch.isChecked = on
        syncing = false
        switchLabel.setText(if (on) R.string.on else R.string.off)
    }

    private fun showPanel(show: Boolean, animate: Boolean = true) {
        if (Build.VERSION.SDK_INT >= 31) {
            content.setRenderEffect(
                if (show) RenderEffect.createBlurEffect(60f, 60f, Shader.TileMode.CLAMP) else null
            )
        }
        if (!animate) {
            panel.visibility = if (show) View.VISIBLE else View.GONE
            panel.alpha = 1f
            return
        }
        panel.animate().cancel()
        if (show) {
            panel.alpha = 0f
            panel.visibility = View.VISIBLE
            panel.animate().alpha(1f).setDuration(180).start()
        } else {
            panel.animate().alpha(0f).setDuration(150)
                .withEndAction { panel.visibility = View.GONE }.start()
        }
    }

    private fun requestTile() {
        if (Build.VERSION.SDK_INT < 33) return
        val sbm = getSystemService(StatusBarManager::class.java)
        sbm.requestAddTileService(
            ComponentName(this, FlashlightTileService::class.java),
            getString(R.string.app_name),
            Icon.createWithResource(this, R.drawable.ic_flashlight),
            mainExecutor
        ) { result ->
            if (result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED) {
                Toast.makeText(this, R.string.tile_exists, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun failed() {
        Toast.makeText(this, R.string.torch_busy, Toast.LENGTH_SHORT).show()
    }

    companion object {
        private const val STATE_PANEL = "panel"
        private const val ACTION_QS_PREFS = "android.service.quicksettings.action.QS_TILE_PREFERENCES"
    }
}
