package com.uladzimirus.koperty

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.os.Bundle
import android.text.format.DateFormat
import android.text.format.Formatter
import android.view.View
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.snackbar.Snackbar
import com.uladzimirus.koperty.data.ParkingSpot
import com.uladzimirus.koperty.ui.CameraState
import com.uladzimirus.koperty.ui.MapViewModel
import com.uladzimirus.koperty.ui.SpotFormatter
import com.uladzimirus.koperty.ui.UiState
import kotlinx.coroutines.launch
import org.osmdroid.api.IGeoPoint
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.CustomZoomButtonsController
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.CopyrightOverlay
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.simplefastpoint.SimpleFastPointOverlay
import org.osmdroid.views.overlay.simplefastpoint.SimpleFastPointOverlayOptions
import org.osmdroid.views.overlay.simplefastpoint.SimplePointTheme
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay
import java.io.File
import java.text.NumberFormat
import java.util.Date
import kotlin.math.max

class MainActivity : AppCompatActivity() {

    private val vm: MapViewModel by viewModels()

    private lateinit var map: MapView
    private lateinit var myLocation: MyLocationNewOverlay
    private lateinit var selectionMarker: Marker
    private lateinit var statusText: TextView
    private lateinit var progress: CircularProgressIndicator
    private lateinit var spotCard: MaterialCardView
    private lateinit var spotTitle: TextView
    private lateinit var spotDetails: TextView

    private val pointOverlays = mutableListOf<SimpleFastPointOverlay>()
    private var shownSpots: List<ParkingSpot>? = null
    private var selected: ParkingSpot? = null
    private var pendingLocationAction: (() -> Unit)? = null

    private val backCallback = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = clearSelection()
    }

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val action = pendingLocationAction
            pendingLocationAction = null
            if (result.values.any { it }) {
                myLocation.enableMyLocation()
                action?.invoke()
            } else {
                snack(getString(R.string.location_denied))
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        configureOsmdroid()
        setContentView(R.layout.activity_main)

        map = findViewById(R.id.map)
        statusText = findViewById(R.id.status_text)
        progress = findViewById(R.id.progress)
        spotCard = findViewById(R.id.spot_card)
        spotTitle = findViewById(R.id.spot_title)
        spotDetails = findViewById(R.id.spot_details)

        setupMap()
        applyInsets()

        findViewById<FloatingActionButton>(R.id.fab_location).setOnClickListener {
            withLocation { map.controller.animateTo(it, max(map.zoomLevelDouble, 15.0), ANIM_MS) }
        }
        findViewById<FloatingActionButton>(R.id.fab_nearest).setOnClickListener { showNearest() }
        findViewById<FloatingActionButton>(R.id.fab_refresh).setOnClickListener { vm.refresh() }
        findViewById<View>(R.id.spot_close).setOnClickListener { clearSelection() }
        findViewById<MaterialButton>(R.id.btn_navigate).setOnClickListener { selected?.let(::navigateTo) }
        findViewById<MaterialButton>(R.id.btn_osm).setOnClickListener {
            selected?.let { openUri(Uri.parse(it.osmUrl)) }
        }
        onBackPressedDispatcher.addCallback(this, backCallback)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                vm.state.collect(::render)
            }
        }
    }

    private fun configureOsmdroid() {
        val config = Configuration.getInstance()
        config.load(applicationContext, getSharedPreferences("osmdroid", MODE_PRIVATE))
        config.userAgentValue = "${BuildConfig.APPLICATION_ID}/${BuildConfig.VERSION_NAME}"
        val base = File(cacheDir, "osmdroid")
        config.osmdroidBasePath = base
        config.osmdroidTileCache = File(base, "tiles")
    }

    private fun setupMap() {
        map.setTileSource(TileSourceFactory.MAPNIK)
        map.setMultiTouchControls(true)
        map.zoomController.setVisibility(CustomZoomButtonsController.Visibility.NEVER)
        map.isTilesScaledToDpi = true
        map.minZoomLevel = 5.0
        map.maxZoomLevel = 19.0
        map.isHorizontalMapRepetitionEnabled = false
        map.isVerticalMapRepetitionEnabled = false
        map.setScrollableAreaLimitDouble(BoundingBox(56.5, 26.5, 47.5, 12.0))

        val camera = vm.camera
        if (camera != null) {
            map.controller.setZoom(camera.zoom)
            map.controller.setCenter(GeoPoint(camera.lat, camera.lon))
        } else {
            map.controller.setZoom(6.4)
            map.controller.setCenter(GeoPoint(52.07, 19.40))
        }

        // Index 0: receives taps that no other overlay consumed.
        map.overlays.add(MapEventsOverlay(object : MapEventsReceiver {
            override fun singleTapConfirmedHelper(p: GeoPoint): Boolean = onMapTap(p)
            override fun longPressHelper(p: GeoPoint): Boolean = false
        }))

        selectionMarker = Marker(map).apply {
            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
            setInfoWindow(null)
            setOnMarkerClickListener { _, _ -> true }
        }

        myLocation = MyLocationNewOverlay(GpsMyLocationProvider(this), map)
        map.overlays.add(myLocation)
        map.overlays.add(CopyrightOverlay(this))
    }

    private fun applyInsets() {
        val ui = findViewById<View>(R.id.ui)
        ViewCompat.setOnApplyWindowInsetsListener(ui) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.updatePadding(left = bars.left, top = bars.top, right = bars.right, bottom = bars.bottom)
            insets
        }
    }

    private fun render(state: UiState) {
        if (state.spots !== shownSpots) {
            shownSpots = state.spots
            showSpots(state.spots)
        }

        progress.isVisible = state.loading
        val nf = NumberFormat.getIntegerInstance()
        statusText.text = when {
            state.loading && state.downloadedBytes > 0 ->
                getString(R.string.status_downloading, Formatter.formatShortFileSize(this, state.downloadedBytes))
            state.loading && state.spots.isEmpty() -> getString(R.string.status_loading)
            state.loading -> getString(R.string.status_updating)
            state.spots.isEmpty() -> getString(R.string.status_no_data)
            else -> resources.getQuantityString(R.plurals.status_count, state.spots.size, nf.format(state.spots.size)) +
                (state.updatedAt?.let { " · " + DateFormat.getDateFormat(this).format(Date(it)) } ?: "")
        }

        state.error?.let { error ->
            vm.errorShown()
            val msg = if (state.spots.isEmpty()) R.string.error_no_data else R.string.error_update
            Snackbar.make(findViewById(R.id.root), getString(msg) + "\n" + (error.message ?: error.javaClass.simpleName),
                Snackbar.LENGTH_INDEFINITE)
                .setAction(R.string.retry) { vm.refresh() }
                .show()
        }
    }

    private fun showSpots(spots: List<ParkingSpot>) {
        pointOverlays.forEach { map.overlays.remove(it) }
        pointOverlays.clear()

        val density = resources.displayMetrics.density
        fun overlayFor(kind: ParkingSpot.Kind, color: Int, radiusDp: Float): SimpleFastPointOverlay? {
            val points: List<IGeoPoint> = spots.filter { it.kind == kind }.map { GeoPoint(it.lat, it.lon) }
            if (points.isEmpty()) return null
            val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; this.color = color }
            val options = SimpleFastPointOverlayOptions.getDefaultStyle()
                .setAlgorithm(SimpleFastPointOverlayOptions.RenderingAlgorithm.MAXIMUM_OPTIMIZATION)
                .setSymbol(SimpleFastPointOverlayOptions.Shape.CIRCLE)
                .setRadius(radiusDp * density)
                .setCellSize((radiusDp * density * 1.6f).toInt().coerceAtLeast(4))
                .setPointStyle(fill)
                .setIsClickable(false)
            return SimpleFastPointOverlay(SimplePointTheme(points, false), options)
        }

        val insertAt = 1 // right above MapEventsOverlay, below my-location and copyright
        listOfNotNull(
            overlayFor(ParkingSpot.Kind.LOT, COLOR_LOT, 6f),
            overlayFor(ParkingSpot.Kind.SPACE, COLOR_SPACE, 5f),
        ).forEachIndexed { i, overlay ->
            map.overlays.add(insertAt + i, overlay)
            pointOverlays += overlay
        }

        // Restore selection after rotation / data refresh.
        val key = vm.selectedKey
        val restored = key?.let { k -> spots.firstOrNull { it.key == k } }
        if (restored != null) select(restored, moveCamera = false) else if (selected != null) clearSelection()
        map.invalidate()
    }

    /** Finds the spot closest to the tap (within a finger-sized radius). */
    private fun onMapTap(p: GeoPoint): Boolean {
        val spots = shownSpots.orEmpty()
        if (map.zoomLevelDouble < MIN_SELECT_ZOOM) {
            if (spots.isNotEmpty()) map.controller.animateTo(p, map.zoomLevelDouble + 2.5, ANIM_MS)
            return true
        }
        val proj = map.projection
        val tap = proj.toPixels(p, null)
        val radius = TAP_RADIUS_DP * resources.displayMetrics.density
        val corner1 = proj.fromPixels((tap.x - radius).toInt(), (tap.y - radius).toInt())
        val corner2 = proj.fromPixels((tap.x + radius).toInt(), (tap.y + radius).toInt())
        val minLat = minOf(corner1.latitude, corner2.latitude)
        val maxLat = maxOf(corner1.latitude, corner2.latitude)
        val minLon = minOf(corner1.longitude, corner2.longitude)
        val maxLon = maxOf(corner1.longitude, corner2.longitude)

        var best: ParkingSpot? = null
        var bestDist = Double.MAX_VALUE
        val pt = android.graphics.Point()
        val gp = GeoPoint(0.0, 0.0)
        for (s in spots) {
            if (s.lat < minLat || s.lat > maxLat || s.lon < minLon || s.lon > maxLon) continue
            gp.setCoords(s.lat, s.lon)
            proj.toPixels(gp, pt)
            val dx = (pt.x - tap.x).toDouble()
            val dy = (pt.y - tap.y).toDouble()
            val d = dx * dx + dy * dy
            if (d < bestDist) {
                bestDist = d
                best = s
            }
        }
        if (best != null) select(best, moveCamera = false) else clearSelection()
        return true
    }

    private fun select(spot: ParkingSpot, moveCamera: Boolean) {
        selected = spot
        vm.selectedKey = spot.key
        selectionMarker.position = GeoPoint(spot.lat, spot.lon)
        if (selectionMarker !in map.overlays) map.overlays.add(map.overlays.indexOf(myLocation), selectionMarker)

        spotTitle.text = SpotFormatter.title(this, spot)
        val distance = myLocation.myLocation?.distanceToAsDouble(GeoPoint(spot.lat, spot.lon))
        spotDetails.text = SpotFormatter.details(this, spot, distance)
        spotCard.isVisible = true
        backCallback.isEnabled = true

        if (moveCamera) map.controller.animateTo(GeoPoint(spot.lat, spot.lon), max(map.zoomLevelDouble, 17.0), ANIM_MS)
        map.invalidate()
    }

    private fun clearSelection() {
        selected = null
        vm.selectedKey = null
        map.overlays.remove(selectionMarker)
        spotCard.isVisible = false
        backCallback.isEnabled = false
        map.invalidate()
    }

    private fun showNearest() {
        val spots = shownSpots.orEmpty()
        if (spots.isEmpty()) {
            snack(getString(R.string.status_no_data))
            return
        }
        withLocation { here ->
            // Cheap pre-filter on degrees, then exact distance.
            val nearest = spots.minByOrNull { s ->
                val dLat = s.lat - here.latitude
                val dLon = (s.lon - here.longitude) * COS_POLAND
                dLat * dLat + dLon * dLon
            } ?: return@withLocation
            select(nearest, moveCamera = true)
        }
    }

    private fun hasLocationPermission(): Boolean =
        listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).any {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }

    private fun withLocation(action: (GeoPoint) -> Unit) {
        if (!hasLocationPermission()) {
            pendingLocationAction = { withLocation(action) }
            locationPermission.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
            return
        }
        myLocation.enableMyLocation()
        val here = myLocation.myLocation
        if (here != null) {
            action(here)
        } else {
            snack(getString(R.string.location_waiting))
            myLocation.runOnFirstFix {
                runOnUiThread { myLocation.myLocation?.let(action) }
            }
        }
    }

    private fun navigateTo(spot: ParkingSpot) {
        val nav = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${spot.lat},${spot.lon}"))
        try {
            startActivity(nav)
        } catch (_: ActivityNotFoundException) {
            val label = Uri.encode(SpotFormatter.title(this, spot))
            openUri(Uri.parse("geo:${spot.lat},${spot.lon}?q=${spot.lat},${spot.lon}($label)"))
        }
    }

    private fun openUri(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            snack(getString(R.string.no_app))
        }
    }

    private fun snack(text: String) = Snackbar.make(findViewById(R.id.root), text, Snackbar.LENGTH_LONG).show()

    override fun onResume() {
        super.onResume()
        map.onResume()
        if (hasLocationPermission()) myLocation.enableMyLocation()
    }

    override fun onPause() {
        val c = map.mapCenter
        vm.camera = CameraState(c.latitude, c.longitude, map.zoomLevelDouble)
        myLocation.disableMyLocation()
        map.onPause()
        super.onPause()
    }

    companion object {
        private const val ANIM_MS = 700L
        private const val MIN_SELECT_ZOOM = 11.0
        private const val TAP_RADIUS_DP = 24f
        private const val COS_POLAND = 0.62 // cos(52°): longitude degrees are shorter in Poland
        private val COLOR_SPACE = Color.parseColor("#1565C0")
        private val COLOR_LOT = Color.parseColor("#00897B")
    }
}
