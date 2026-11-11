package com.kp.aviaorders

/** JNI-доступ к ядру на C++ (libaviacore.so). */
object NativeCore {
    init {
        System.loadLibrary("aviacore")
    }

    external fun call(args: Array<String>): String
}

class CoreException(message: String) : Exception(message)

val FLIGHT_TYPES = listOf("Внутренний", "Международный")
val SERVICE_CLASSES = listOf("Эконом", "Бизнес", "Первый")
val ORDER_STATUSES = listOf("Новая", "Забронирована", "Оплачена", "Отменена")

data class Airline(val id: Int, val code: String, val name: String, val country: String, val flights: Int)

data class Flight(
    val id: Int, val number: String, val airlineId: Int, val airline: String, val from: String, val to: String,
    val date: String, val time: String, val type: Int, val seats: Int, val free: Int, val price: String,
)

data class Client(val id: Int, val name: String, val passport: String, val phone: String, val email: String)

data class Order(
    val id: Int, val clientId: Int, val client: String, val flightId: Int, val flight: String, val route: String,
    val departure: String, val cls: Int, val status: Int, val price: String, val created: String,
)

data class Passenger(val clientId: Int, val name: String, val passport: String, val cls: Int, val status: Int, val orderId: Int)

/** Тонкая обёртка над текстовым протоколом CommandApi. */
object Core {
    fun exec(vararg args: String): String {
        val res = NativeCore.call(arrayOf(*args))
        val nl = res.indexOf('\n')
        val head = if (nl < 0) res else res.substring(0, nl)
        val body = if (nl < 0) "" else res.substring(nl + 1)
        if (head != "OK") throw CoreException(body.ifBlank { "Ошибка" })
        return body
    }

    private fun rows(vararg args: String): List<List<String>> =
        exec(*args).split('\n').filter { it.isNotEmpty() }.map { it.split('\t') }

    private fun flight(r: List<String>) = Flight(
        r[0].toInt(), r[1], r[2].toInt(), r[3], r[4], r[5], r[6], r[7], r[8].toInt(), r[9].toInt(), r[10].toInt(), r[11],
    )

    private fun order(r: List<String>) = Order(
        r[0].toInt(), r[1].toInt(), r[2], r[3].toInt(), r[4], r[5], r[6], r[7].toInt(), r[8].toInt(), r[9], r[10],
    )

    fun airlines() = rows("airlines").map { Airline(it[0].toInt(), it[1], it[2], it[3], it[4].toInt()) }
    fun flights() = rows("flights").map(::flight)
    fun clients() = rows("clients").map { Client(it[0].toInt(), it[1], it[2], it[3], it[4]) }
    fun orders() = rows("orders").map(::order)

    // Запросы (п. 3 ТЗ)
    fun ordersByClient(clientId: Int) = rows("q_ordersByClient", "$clientId").map(::order)
    fun searchFlights(dest: String, date: String) = rows("q_searchFlights", dest, date).map(::flight)
    fun paidCount(flightId: Int) = exec("q_paidCount", "$flightId").trim().toInt()
    fun flightsByAirline(airlineId: Int) = rows("q_flightsByAirline", "$airlineId").map(::flight)
    fun revenueFlight(flightId: Int) = exec("q_revenueFlight", "$flightId").trim()
    fun revenueAirline(airlineId: Int) = exec("q_revenueAirline", "$airlineId").trim()
    fun passengers(flightId: Int) = rows("q_passengers", "$flightId").map {
        Passenger(it[0].toInt(), it[1], it[2], it[3].toInt(), it[4].toInt(), it[5].toInt())
    }

    // Операции (п. 4 ТЗ)
    fun createOrder(clientId: Int, flightId: Int, cls: Int) = exec("createOrder", "$clientId", "$flightId", "$cls")
    fun setStatus(orderId: Int, status: Int) = exec("setStatus", "$orderId", "$status")
    fun addFlight(
        number: String, airlineId: Int, from: String, to: String, date: String, time: String, type: Int,
        seats: String, price: String,
    ) = exec("addFlight", number, "$airlineId", from, to, date, time, "$type", seats, price)

    fun removeFlight(id: Int) = exec("removeFlight", "$id")
    fun addClient(name: String, passport: String, phone: String, email: String) =
        exec("addClient", name, passport, phone, email)

    fun editClient(id: Int, name: String, passport: String, phone: String, email: String) =
        exec("editClient", "$id", name, passport, phone, email)

    fun removeClient(id: Int) = exec("removeClient", "$id")
    fun addAirline(code: String, name: String, country: String) = exec("addAirline", code, name, country)
    fun removeAirline(id: Int) = exec("removeAirline", "$id")

    // Файлы (п. 5 ТЗ)
    fun init(path: String) = exec("init", path)
    fun save(path: String) = exec("save", path)
    fun load(path: String) = exec("load", path)
    fun reset() = exec("reset")
}
