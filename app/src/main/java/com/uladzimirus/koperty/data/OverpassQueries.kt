package com.uladzimirus.koperty.data

object OverpassQueries {

    private val FIELDS = listOf(
        "::type", "::id", "::lat", "::lon",
        "amenity", "parking_space", "capacity:disabled", "capacity",
        "access", "motor_vehicle", "motorcar", "vehicle", "disabled",
        "fee", "name", "operator", "surface", "parking", "maxstay", "opening_hours",
        "description", "note", "inscription", "ref",
    )

    /** All disabled parking in Poland. */
    fun poland(): String = build(
        prefix = "area[\"ISO3166-1\"=\"PL\"][admin_level=2]->.pl;",
        filter = "(area.pl)",
    )

    /** Disabled parking inside a bounding box (south, west, north, east). */
    fun bbox(south: Double, west: Double, north: Double, east: Double): String =
        build(prefix = "", filter = "($south,$west,$north,$east)")

    private fun build(prefix: String, filter: String): String {
        val fields = FIELDS.joinToString(",") { if (it.startsWith("::")) it else "\"$it\"" }
        // Restricted access is filtered on the server too, to keep the download small.
        val notPrivate = "[\"access\"!~\"^(private|no)$\"]"
        return """
            [out:csv($fields;true)][timeout:300];
            $prefix
            (
              nwr["amenity"="parking_space"]["parking_space"="disabled"]$notPrivate$filter;
              nwr["amenity"="parking_space"]["capacity:disabled"]$notPrivate$filter;
              nwr["amenity"="parking"]["capacity:disabled"]["capacity:disabled"!~"^(no|0)$"]$notPrivate$filter;
            );
            out center qt;
        """.trimIndent()
    }
}
