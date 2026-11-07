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
        try {
            client.download(OverpassQueries.poland(), tmp, onProgress)
            val spots = tmp.bufferedReader().useLines { SpotParser.parse(it) }
            // Overpass CSV has no error trailer, so a truncated/failed answer shows up as "too few rows".
            if (spots.size < MIN_EXPECTED) throw IOException("Incomplete answer from Overpass: ${spots.size} rows")
            tmp.copyTo(cacheFile, overwrite = true)
            Snapshot(spots, cacheFile.lastModified())
        } finally {
            tmp.delete()
        }
    }

    companion object {
        private const val MIN_EXPECTED = 500
        const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1000
    }
}
