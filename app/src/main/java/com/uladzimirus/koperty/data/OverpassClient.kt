package com.uladzimirus.koperty.data

import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Downloads Overpass API results to a file, falling back to mirror servers. */
class OverpassClient(
    private val userAgent: String,
    private val endpoints: List<String> = DEFAULT_ENDPOINTS,
) {
    /** @param onProgress called with the number of bytes received so far. */
    fun download(query: String, dest: File, onProgress: (Long) -> Unit = {}) {
        var lastError: Exception? = null
        for (endpoint in endpoints) {
            try {
                downloadFrom(endpoint, query, dest, onProgress)
                return
            } catch (e: IOException) {
                lastError = e
                dest.delete()
            }
        }
        throw lastError ?: IOException("No Overpass endpoints configured")
    }

    private fun downloadFrom(endpoint: String, query: String, dest: File, onProgress: (Long) -> Unit) {
        val conn = URL(endpoint).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 20_000
            conn.readTimeout = 300_000
            conn.setRequestProperty("User-Agent", userAgent)
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
            conn.outputStream.use { it.write(("data=" + URLEncoder.encode(query, "UTF-8")).toByteArray()) }

            val code = conn.responseCode
            if (code != HttpURLConnection.HTTP_OK) throw IOException("HTTP $code from $endpoint")
            val contentType = conn.contentType.orEmpty()
            if (contentType.contains("html", ignoreCase = true)) throw IOException("Unexpected $contentType from $endpoint")

            conn.inputStream.use { input ->
                dest.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    var total = 0L
                    var lastReport = 0L
                    while (true) {
                        val read = input.read(buffer)
                        if (read < 0) break
                        output.write(buffer, 0, read)
                        total += read
                        if (total - lastReport > 256 * 1024) {
                            lastReport = total
                            onProgress(total)
                        }
                    }
                    onProgress(total)
                }
            }
        } finally {
            conn.disconnect()
        }
    }

    companion object {
        val DEFAULT_ENDPOINTS = listOf(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        )
    }
}
