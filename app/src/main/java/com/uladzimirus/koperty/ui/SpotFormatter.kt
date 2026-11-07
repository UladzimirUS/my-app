package com.uladzimirus.koperty.ui

import android.content.Context
import com.uladzimirus.koperty.R
import com.uladzimirus.koperty.data.ParkingSpot
import java.text.NumberFormat
import kotlin.math.roundToInt

object SpotFormatter {

    fun title(ctx: Context, spot: ParkingSpot): String = when (spot.kind) {
        ParkingSpot.Kind.SPACE -> {
            val n = spot.disabledSpaces ?: 1
            if (n > 1) ctx.resources.getQuantityString(R.plurals.spaces_disabled, n, n)
            else ctx.getString(R.string.title_single_space)
        }
        ParkingSpot.Kind.LOT -> spot.details["name"] ?: ctx.getString(R.string.title_parking_lot)
    }

    fun details(ctx: Context, spot: ParkingSpot, distanceMeters: Double?): String {
        val d = spot.details
        val lines = mutableListOf<String>()

        if (spot.kind == ParkingSpot.Kind.LOT) {
            lines += spot.disabledSpaces?.let { ctx.resources.getQuantityString(R.plurals.spaces_disabled, it, it) }
                ?: ctx.getString(R.string.spaces_disabled_unknown)
        } else {
            d["name"]?.let { lines += it }
        }

        lines += ctx.getString(R.string.label_access, accessLabel(ctx, d["access"]))
        when (d["fee"]?.lowercase()) {
            "yes" -> lines += ctx.getString(R.string.fee_yes)
            "no" -> lines += ctx.getString(R.string.fee_no)
        }
        d["maxstay"]?.let { lines += ctx.getString(R.string.label_maxstay, it) }
        d["opening_hours"]?.let { lines += ctx.getString(R.string.label_hours, it) }
        parkingType(ctx, d["parking"])?.let { lines += it }
        d["operator"]?.let { lines += ctx.getString(R.string.label_operator, it) }
        d["description"]?.let { lines += it }
        distanceMeters?.let { lines += ctx.getString(R.string.label_distance, formatDistance(it)) }
        return lines.joinToString("\n")
    }

    private fun accessLabel(ctx: Context, access: String?): String = when (access?.lowercase()) {
        null -> ctx.getString(R.string.access_unknown)
        "yes", "public", "designated" -> ctx.getString(R.string.access_public)
        "customers" -> ctx.getString(R.string.access_customers)
        "permissive" -> ctx.getString(R.string.access_permissive)
        "destination" -> ctx.getString(R.string.access_destination)
        "permit" -> ctx.getString(R.string.access_permit)
        else -> access
    }

    private fun parkingType(ctx: Context, parking: String?): String? = when (parking?.lowercase()) {
        "underground" -> ctx.getString(R.string.parking_underground)
        "multi-storey" -> ctx.getString(R.string.parking_multistorey)
        "street_side", "lane", "on_kerb", "half_on_kerb", "on_street" -> ctx.getString(R.string.parking_street)
        "surface" -> ctx.getString(R.string.parking_surface)
        "rooftop" -> ctx.getString(R.string.parking_rooftop)
        else -> null
    }

    fun formatDistance(m: Double): String =
        if (m < 1000) "${m.roundToInt()} m"
        else NumberFormat.getNumberInstance().apply { maximumFractionDigits = 1 }.format(m / 1000) + " km"
}
