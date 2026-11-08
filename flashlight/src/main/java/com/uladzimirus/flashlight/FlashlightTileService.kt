package com.uladzimirus.flashlight

import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Quick Settings tile. Long-press opens the settings panel (QS_TILE_PREFERENCES). */
class FlashlightTileService : TileService() {
    private lateinit var torch: Torch

    override fun onCreate() {
        super.onCreate()
        torch = Torch(this)
    }

    override fun onStartListening() {
        super.onStartListening()
        torch.listen { render() }
        render()
    }

    override fun onStopListening() {
        torch.stopListening()
        super.onStopListening()
    }

    override fun onClick() {
        torch.toggle()
        render()
    }

    private fun render() {
        val tile = qsTile ?: return
        tile.state = when {
            !torch.hasFlash -> Tile.STATE_UNAVAILABLE
            torch.isOn -> Tile.STATE_ACTIVE
            else -> Tile.STATE_INACTIVE
        }
        tile.updateTile()
    }
}
