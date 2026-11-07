package com.uladzimirus.koperty.data

/**
 * Parses Overpass CSV (tab separated, with header) and keeps only places that are
 * open to any holder of a disabled parking card, i.e. drops private / personal ("imienne") spaces.
 */
object SpotParser {

    /** Tags that are kept on the spot and shown in the UI. */
    val DETAIL_KEYS = setOf(
        "name", "operator", "access", "fee", "surface", "parking",
        "maxstay", "opening_hours", "description",
    )

    /** Access values meaning that a random card holder may NOT park there. */
    private val RESTRICTED_ACCESS = setOf(
        "private", "no", "residents", "employees", "staff", "delivery",
        "emergency", "military", "agricultural", "forestry", "official",
    )

    private val ACCESS_KEYS = listOf("access", "motor_vehicle", "motorcar", "vehicle", "disabled")

    /** Free-text markers of a personal (reserved for a specific person/car) space. Lowercase. */
    private val PERSONAL_MARKERS = listOf(
        "imienn", "rejestrac", "nr rej", "zastrzeż", "zastrzez", "prywatn",
        "tylko dla mieszkańców", "tylko dla mieszkancow", "tylko dla pracownik",
        "dla pracowników", "dla pracownikow", "abonament", "wydzierżaw", "wydzierzaw",
        "private", "reserved for",
    )

    private val TEXT_KEYS = listOf("name", "description", "note", "inscription", "ref")

    /** Polish (and most EU) registration plate, e.g. "WA 12345", "KR1AB23", "DW-4XY12". */
    private val PLATE = Regex("^[A-Z]{2,3}[ -]?[0-9A-Z]{4,5}$")

    private val FIRST_NUMBER = Regex("\\d+")

    fun parse(lines: Sequence<String>): List<ParkingSpot> {
        val iterator = lines.iterator()
        if (!iterator.hasNext()) return emptyList()
        val header = iterator.next().split('\t').map { it.trim().removePrefix("@").removePrefix("::") }
        if ("type" !in header || "id" !in header || "lat" !in header || "lon" !in header) return emptyList()

        val result = ArrayList<ParkingSpot>()
        val seen = HashSet<String>()
        val tags = HashMap<String, String>()
        while (iterator.hasNext()) {
            val line = iterator.next()
            if (line.isBlank()) continue
            val cols = line.split('\t')
            if (cols.size != header.size) continue // malformed row (tab or newline inside a value)
            tags.clear()
            for (i in header.indices) {
                val v = cols[i].trim()
                if (v.isNotEmpty()) tags[header[i]] = v
            }
            val spot = fromTags(tags) ?: continue
            if (seen.add(spot.key)) result.add(spot)
        }
        return result
    }

    fun fromTags(t: Map<String, String>): ParkingSpot? {
        val type = t["type"] ?: return null
        val id = t["id"]?.toLongOrNull() ?: return null
        val lat = t["lat"]?.toDoubleOrNull() ?: return null
        val lon = t["lon"]?.toDoubleOrNull() ?: return null

        val capDisabled = capacity(t["capacity:disabled"])
        val kind: ParkingSpot.Kind
        val count: Int?
        when (t["amenity"]) {
            "parking_space" -> {
                kind = ParkingSpot.Kind.SPACE
                val designated = t["parking_space"] == "disabled"
                count = when {
                    capDisabled is Capacity.Count -> capDisabled.n
                    designated -> (capacity(t["capacity"]) as? Capacity.Count)?.n ?: 1
                    capDisabled is Capacity.Unknown -> null
                    else -> return null
                }
            }
            "parking" -> {
                kind = ParkingSpot.Kind.LOT
                count = when (capDisabled) {
                    is Capacity.Count -> capDisabled.n
                    Capacity.Unknown -> null
                    Capacity.None -> return null
                }
            }
            else -> return null
        }

        if (isRestricted(t)) return null

        val details = DETAIL_KEYS.mapNotNull { k -> t[k]?.let { k to it } }.toMap()
        return ParkingSpot(type, id, lat, lon, kind, count, details)
    }

    fun isRestricted(t: Map<String, String>): Boolean {
        for (k in ACCESS_KEYS) {
            val v = t[k]?.lowercase() ?: continue
            if (v.split(';').any { it.trim() in RESTRICTED_ACCESS }) return true
        }
        for (k in TEXT_KEYS) {
            val v = t[k] ?: continue
            val lower = v.lowercase()
            if (PERSONAL_MARKERS.any { it in lower }) return true
        }
        val ref = t["ref"]?.trim()?.uppercase()
        if (ref != null && PLATE.matches(ref) && ref.any { it.isDigit() } && ref.any { it.isLetter() }) {
            return true
        }
        return false
    }

    private sealed interface Capacity {
        data class Count(val n: Int) : Capacity
        data object Unknown : Capacity
        data object None : Capacity
    }

    private fun capacity(raw: String?): Capacity {
        val v = raw?.trim()?.lowercase() ?: return Capacity.None
        if (v.isEmpty() || v == "no" || v == "none") return Capacity.None
        val n = FIRST_NUMBER.find(v)?.value?.toIntOrNull()
        return when {
            n == null -> if (v == "yes" || v == "designated") Capacity.Unknown else Capacity.None
            n > 0 -> Capacity.Count(n)
            else -> Capacity.None
        }
    }
}
