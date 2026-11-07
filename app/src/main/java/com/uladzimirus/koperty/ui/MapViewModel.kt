package com.uladzimirus.koperty.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.uladzimirus.koperty.data.ParkingSpot
import com.uladzimirus.koperty.data.SpotRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UiState(
    val spots: List<ParkingSpot> = emptyList(),
    val updatedAt: Long? = null,
    val loading: Boolean = true,
    val downloadedBytes: Long = 0,
    /** One-shot error, cleared by [MapViewModel.errorShown]. */
    val error: Throwable? = null,
)

data class CameraState(val lat: Double, val lon: Double, val zoom: Double)

class MapViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = SpotRepository(app)
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    var camera: CameraState? = null
    var selectedKey: String? = null

    private var downloadJob: Job? = null

    init {
        viewModelScope.launch {
            val cached = runCatching { repo.loadCached() }.getOrNull()
            if (cached != null) {
                _state.update { it.copy(spots = cached.spots, updatedAt = cached.updatedAt, loading = false) }
            }
            if (cached == null || System.currentTimeMillis() - cached.updatedAt > SpotRepository.MAX_AGE_MS) {
                refresh()
            }
        }
    }

    fun refresh() {
        if (downloadJob?.isActive == true) return
        downloadJob = viewModelScope.launch {
            _state.update { it.copy(loading = true, downloadedBytes = 0) }
            try {
                val snapshot = repo.downloadPoland { bytes -> _state.update { it.copy(downloadedBytes = bytes) } }
                _state.update { it.copy(spots = snapshot.spots, updatedAt = snapshot.updatedAt, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = e) }
            }
        }
    }

    fun errorShown() = _state.update { it.copy(error = null) }
}
