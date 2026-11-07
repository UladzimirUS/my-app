package com.uladzimirus.koperty.data

import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.zip.GZIPInputStream

/** Downloads Overpass API results to a file, falling back to mirror servers. */
class OverpassClient(
    private val userAgent: String,
    private val endpoints: List<String> = DEFAULT_ENDPOINTS,
) {
    /** @param onProgress called with the number of bytes received so far. */
    fun download(query: String, dest: File, onProgress: (Long) -> Unit = {}) {
        val errors = mutableListOf<String>()
        for (endpoint in endpoints) {
            try {
                downloadFrom(endpoint, query, dest, onProgress)
                return
            } catch (e: IOException) {
                errors += e.message ?: "${e.javaClass.simpleName}: ${host(endpoint)}"
                dest.delete()
            }
        }
        throw IOException(errors.joinToString("; ").ifEmpty { "No Overpass endpoints configured" })
    }

    /** Plain GET of a (optionally .gz) file, e.g. the prebuilt dataset. */
    fun get(url: String, dest: File, onProgress: (Long) -> Unit = {}) {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.instanceFollowRedirects = true
            conn.connectTimeout = 20_000
            conn.readTimeout = 60_000
            conn.setRequestProperty("User-Agent", userAgent)
            val code = conn.responseCode
            if (code != HttpURLConnection.HTTP_OK) throw IOException("HTTP $code: ${host(url)}")
            val raw = conn.inputStream
            val input = if (url.endsWith(".gz")) GZIPInputStream(raw, 64 * 1024) else raw
            copy(input, dest, onProgress)
        } finally {
            conn.disconnect()
        }
    }

    private fun downloadFrom(endpoint: String, query: String, dest: File, onProgress: (Long) -> Unit) {
        val conn = URL(endpoint).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 20_000
            conn.readTimeout = 330_000
            conn.setRequestProperty("User-Agent", userAgent)
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
            conn.outputStream.use { it.write(("data=" + URLEncoder.encode(query, "UTF-8")).toByteArray()) }

            val code = conn.responseCode
            if (code != HttpURLConnection.HTTP_OK) throw IOException("HTTP $code: ${host(endpoint)}")
            val contentType = conn.contentType.orEmpty()
            if (contentType.contains("html", ignoreCase = true)) throw IOException("$contentType: ${host(endpoint)}")
            copy(conn.inputStream, dest, onProgress)
        } finally {
            conn.disconnect()
        }
    }

    private fun host(url: String) = runCatching { URL(url).host }.getOrDefault(url)

    private fun copy(stream: java.io.InputStream, dest: File, onProgress: (Long) -> Unit) {
            stream.use { input ->
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
    }

    companion object {
        val DEFAULT_ENDPOINTS = listOf(
            "https://overpass-api.de/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        )
    }
}
