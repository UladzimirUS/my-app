package com.uladzimirus.koperty.data

/**
 * Publicly available parking place for people with disabilities, taken from OpenStreetMap.
 *
 * @property disabledSpaces number of spaces for people with disabilities, or null when OSM only says "yes".
 * @property details a small subset of OSM tags that is shown to the user.
 */
data class ParkingSpot(
    val osmType: String,
    val osmId: Long,
    val lat: Double,
    val lon: Double,
    val kind: Kind,
    val disabledSpaces: Int?,
    val details: Map<String, String>,
) {
    enum class Kind {
        /** A single (or a few) marked disabled spaces: amenity=parking_space. */
        SPACE,

        /** A parking lot that has disabled spaces: amenity=parking + capacity:disabled. */
        LOT,
    }

    val key: String get() = "$osmType/$osmId"
    val osmUrl: String get() = "https://www.openstreetmap.org/$osmType/$osmId"
}
