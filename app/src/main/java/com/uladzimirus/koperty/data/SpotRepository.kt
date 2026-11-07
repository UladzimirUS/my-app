package com.uladzimirus.koperty.data

import android.content.Context
import com.uladzimirus.koperty.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException

class SpotRepository(context: Context) {

    data class Snapshot(val spots: List<ParkingSpot>, val updatedAt: Long)

    private val appContext = context.applicationContext
    private val cacheFile = File(appContext.filesDir, "spots_pl.tsv")
    private val client = OverpassClient(
        userAgent = "Koperty/${BuildConfig.VERSION_NAME} (Android; https://github.com/UladzimirUS/my-app)",
    )

    suspend fun loadCached(): Snapshot? = withContext(Dispatchers.IO) {
        if (!cacheFile.isFile) return@withContext null
        val spots = cacheFile.bufferedReader().useLines { SpotParser.parse(it) }
        if (spots.isEmpty()) null else Snapshot(spots, cacheFile.lastModified())
    }

    suspend fun downloadPoland(onProgress: (Long) -> Unit): Snapshot = withContext(Dispatchers.IO) {
        val tmp = File(appContext.cacheDir, "spots_download.tsv")
        val errors = mutableListOf<String>()
        try {
            // 1) Prebuilt daily dataset (fast, served by GitHub CDN). 2) Live Overpass query as fallback.
            val sources: List<Pair<String, () -> Unit>> = listOf(
                "GitHub" to { client.get(DATASET_URL, tmp, onProgress) },
                "Overpass" to { client.download(OverpassQueries.poland(), tmp, onProgress) },
            )
            for ((name, fetch) in sources) {
                try {
                    onProgress(0)
                    fetch()
                    val spots = tmp.bufferedReader().useLines { SpotParser.parse(it) }
                    // Overpass CSV has no error trailer, so a truncated/failed answer shows up as "too few rows".
                    if (spots.size < MIN_EXPECTED) throw IOException("${spots.size} rows")
                    tmp.copyTo(cacheFile, overwrite = true)
                    return@withContext Snapshot(spots, cacheFile.lastModified())
                } catch (e: IOException) {
                    errors += "$name: ${e.message ?: e.javaClass.simpleName}"
                }
            }
            throw IOException(errors.joinToString("\n"))
        } finally {
            tmp.delete()
        }
    }

    companion object {
        private const val MIN_EXPECTED = 500
        const val DATASET_URL = "https://github.com/UladzimirUS/my-app/releases/download/data/spots_pl.tsv.gz"
        const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000
    }
}
