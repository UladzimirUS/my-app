package com.uladzimirus.koperty.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SpotParserTest {

    private val header = listOf(
        "@type", "@id", "@lat", "@lon", "amenity", "parking_space", "capacity:disabled", "capacity",
        "access", "name", "ref", "note",
    )

    private fun row(vararg pairs: Pair<String, String>): String {
        val m = pairs.toMap()
        return header.joinToString("\t") { m[it.removePrefix("@")].orEmpty() }
    }

    private fun base(type: String = "node", id: String = "1") =
        arrayOf("type" to type, "id" to id, "lat" to "52.2297", "lon" to "21.0122")

    private fun parse(vararg rows: String) =
        SpotParser.parse((listOf(header.joinToString("\t")) + rows).asSequence())

    @Test
    fun publicDisabledSpaceIsIncluded() {
        val spots = parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled"))
        assertEquals(1, spots.size)
        assertEquals(ParkingSpot.Kind.SPACE, spots[0].kind)
        assertEquals(1, spots[0].disabledSpaces)
        assertEquals(52.2297, spots[0].lat, 1e-9)
    }

    @Test
    fun disabledSpaceAreaUsesCapacity() {
        val spots = parse(row(*base("way", "7"), "amenity" to "parking_space", "parking_space" to "disabled", "capacity" to "3"))
        assertEquals(3, spots.single().disabledSpaces)
        assertEquals("https://www.openstreetmap.org/way/7", spots.single().osmUrl)
    }

    @Test
    fun privateSpaceIsExcluded() {
        assertTrue(parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "access" to "private")).isEmpty())
        assertTrue(parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "access" to "residents")).isEmpty())
    }

    @Test
    fun personalSpaceByTextIsExcluded() {
        assertTrue(parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "name" to "Koperta imienna")).isEmpty())
        assertTrue(parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "note" to "Nr rej. WA12345")).isEmpty())
    }

    @Test
    fun personalSpaceByPlateRefIsExcluded() {
        assertTrue(parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "ref" to "KR 1AB23")).isEmpty())
        assertEquals(1, parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "ref" to "12")).size)
        assertEquals(1, parse(row(*base(), "amenity" to "parking_space", "parking_space" to "disabled", "ref" to "P12")).size)
    }

    @Test
    fun customersParkingIsIncluded() {
        val spots = parse(row(*base(), "amenity" to "parking", "capacity:disabled" to "4", "access" to "customers"))
        assertEquals(ParkingSpot.Kind.LOT, spots.single().kind)
        assertEquals(4, spots.single().disabledSpaces)
        assertEquals("customers", spots.single().details["access"])
    }

    @Test
    fun parkingLotCapacityVariants() {
        assertNull(parse(row(*base(), "amenity" to "parking", "capacity:disabled" to "yes")).single().disabledSpaces)
        assertTrue(parse(row(*base(), "amenity" to "parking", "capacity:disabled" to "no")).isEmpty())
        assertTrue(parse(row(*base(), "amenity" to "parking", "capacity:disabled" to "0")).isEmpty())
        assertTrue(parse(row(*base(), "amenity" to "parking")).isEmpty())
    }

    @Test
    fun malformedRowsAndDuplicatesAreSkipped() {
        val good = row(*base(), "amenity" to "parking_space", "parking_space" to "disabled")
        val spots = parse(good, good, "node\t2\t52.0", "", row("type" to "node", "id" to "x", "lat" to "1", "lon" to "1"))
        assertEquals(1, spots.size)
    }

    @Test
    fun wrongHeaderGivesEmptyList() {
        assertTrue(SpotParser.parse(sequenceOf("<html>error</html>", "foo")).isEmpty())
    }

    @Test
    fun queryContainsAllFilters() {
        val q = OverpassQueries.poland()
        assertTrue(q.contains("\"parking_space\"=\"disabled\""))
        assertTrue(q.contains("\"capacity:disabled\""))
        assertTrue(q.contains("ISO3166-1"))
        assertTrue(q.startsWith("[out:csv(::type,::id,::lat,::lon,"))
    }
}
