package com.kp.aviaorders

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.tabs.TabLayout
import java.io.File
import java.util.Calendar
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private enum class Tab(val title: String) {
        ORDERS("Заявки"), FLIGHTS("Рейсы"), CLIENTS("Клиенты"), AIRLINES("Компании"), QUERIES("Запросы")
    }

    /** Строка списка: заголовок, подзаголовок, действие по нажатию. */
    private class Row(val title: String, val subtitle: String, val onClick: () -> Unit)

    private lateinit var tabs: TabLayout
    private lateinit var list: ListView
    private lateinit var empty: TextView
    private lateinit var fab: FloatingActionButton
    private var current = Tab.ORDERS

    private val dataFile by lazy { File(filesDir, "avia_data.txt").absolutePath }
    private val tmpFile by lazy { File(cacheDir, "transfer.txt").absolutePath }

    // Выгрузка в файл: C++ пишет во временный файл (operator<<), затем копируем в выбранный документ.
    private val exportLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri == null) return@registerForActivityResult
        safely {
            Core.save(tmpFile)
            contentResolver.openOutputStream(uri, "wt")!!.use { out -> File(tmpFile).inputStream().use { it.copyTo(out) } }
            toast("Данные выгружены в файл")
        }
    }

    // Загрузка из файла: копируем документ во временный файл, C++ читает его (operator>>).
    private val importLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@registerForActivityResult
        safely {
            contentResolver.openInputStream(uri)!!.use { inp -> File(tmpFile).outputStream().use { inp.copyTo(it) } }
            Core.load(tmpFile)
            refresh()
            toast("Данные загружены из файла")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildLayout()
        safely { Core.init(dataFile) }
        current = Tab.entries[savedInstanceState?.getInt("tab") ?: 0]
        tabs.getTabAt(current.ordinal)?.select()
        refresh()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putInt("tab", current.ordinal)
    }

    // ------------------------------------------------------------------ разметка

    private fun buildLayout() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        tabs = TabLayout(this).apply {
            tabMode = TabLayout.MODE_SCROLLABLE
            Tab.entries.forEach { addTab(newTab().setText(it.title)) }
            addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
                override fun onTabSelected(tab: TabLayout.Tab) {
                    current = Tab.entries[tab.position]
                    refresh()
                }

                override fun onTabUnselected(tab: TabLayout.Tab) {}
                override fun onTabReselected(tab: TabLayout.Tab) {}
            })
        }
        root.addView(tabs)

        val frame = FrameLayout(this)
        list = ListView(this).apply { clipToPadding = false; setPadding(0, 0, 0, dp(88)) }
        empty = TextView(this).apply {
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(24), dp(24), dp(24))
            text = "Нет данных"
        }
        list.emptyView = empty
        fab = FloatingActionButton(this).apply {
            setImageResource(android.R.drawable.ic_input_add)
            contentDescription = "Добавить"
            setOnClickListener { onAdd() }
        }
        frame.addView(list, FrameLayout.LayoutParams(-1, -1))
        frame.addView(empty, FrameLayout.LayoutParams(-1, -1))
        frame.addView(fab, FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM or Gravity.END).apply {
            setMargins(dp(16), dp(16), dp(16), dp(16))
        })
        root.addView(frame, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(bars.left, 0, bars.right, bars.bottom)
            insets
        }
    }

    private fun showRows(rows: List<Row>) {
        list.adapter = object : ArrayAdapter<Row>(this, android.R.layout.simple_list_item_2, android.R.id.text1, rows) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val v = super.getView(position, convertView, parent)
                val r = getItem(position)!!
                v.findViewById<TextView>(android.R.id.text1).text = r.title
                v.findViewById<TextView>(android.R.id.text2).text = r.subtitle
                return v
            }
        }
        list.onItemClickListener = AdapterView.OnItemClickListener { _, _, pos, _ -> rows[pos].onClick() }
    }

    private fun refresh() {
        fab.visibility = if (current == Tab.QUERIES) View.GONE else View.VISIBLE
        safely {
            showRows(
                when (current) {
                    Tab.ORDERS -> Core.orders().map { orderRow(it) }
                    Tab.FLIGHTS -> Core.flights().map { flightRow(it) }
                    Tab.CLIENTS -> Core.clients().map { c ->
                        Row(c.name, "Паспорт ${c.passport} · ${c.phone}" + if (c.email.isNotEmpty()) " · ${c.email}" else "") {
                            clientActions(c)
                        }
                    }
                    Tab.AIRLINES -> Core.airlines().map { a ->
                        Row("[${a.code}] ${a.name}", "${a.country} · рейсов: ${a.flights}") { airlineActions(a) }
                    }
                    Tab.QUERIES -> queryRows()
                },
            )
        }
    }

    private fun orderRow(o: Order) = Row(
        "№${o.id} · ${o.client}",
        "${o.flight} ${o.route}, ${o.departure}\n${SERVICE_CLASSES[o.cls]} · ${ORDER_STATUSES[o.status]} · ${o.price} zł",
    ) { orderActions(o) }

    private fun flightRow(f: Flight) = Row(
        "${f.number} · ${f.from} → ${f.to}",
        "${f.date} ${f.time} · ${f.airline} · ${FLIGHT_TYPES[f.type].lowercase()}\n" +
            "Свободно ${f.free} из ${f.seats} · эконом ${f.price} zł",
    ) { flightActions(f) }

    // ------------------------------------------------------------------ меню

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menu.add(0, 1, 0, "Выгрузить в файл")
        menu.add(0, 2, 1, "Загрузить из файла")
        menu.add(0, 3, 2, "Сбросить к демо-данным")
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            1 -> exportLauncher.launch("avia_data.txt")
            2 -> importLauncher.launch(arrayOf("text/*", "application/octet-stream"))
            3 -> confirm("Заменить все данные демонстрационными?") { safely { Core.reset(); refresh() } }
            else -> return super.onOptionsItemSelected(item)
        }
        return true
    }

    // ------------------------------------------------------------------ действия по элементам

    private fun orderActions(o: Order) {
        val actions = mutableListOf<Pair<String, () -> Unit>>()
        if (o.status == 0) actions += "Забронировать" to { changeStatus(o, 1) }
        if (o.status == 0 || o.status == 1) actions += "Оплатить" to { changeStatus(o, 2) }
        if (o.status != 3) actions += "Отменить" to { changeStatus(o, 3) }
        val info = "Клиент: ${o.client}\nРейс: ${o.flight} ${o.route}\nВылет: ${o.departure}\n" +
            "Класс: ${SERVICE_CLASSES[o.cls]}\nСтатус: ${ORDER_STATUSES[o.status]}\nСтоимость: ${o.price} zł\nСоздана: ${o.created}"
        if (actions.isEmpty()) {
            AlertDialog.Builder(this).setTitle("Заявка №${o.id}").setMessage(info).setPositiveButton("OK", null).show()
            return
        }
        AlertDialog.Builder(this).setTitle("Заявка №${o.id}")
            .setItems(actions.map { it.first }.toTypedArray()) { _, i -> actions[i].second() }
            .setNegativeButton("Закрыть", null)
            .setNeutralButton("Подробнее") { _, _ ->
                AlertDialog.Builder(this).setTitle("Заявка №${o.id}").setMessage(info).setPositiveButton("OK", null).show()
            }
            .show()
    }

    private fun changeStatus(o: Order, status: Int) = safely {
        Core.setStatus(o.id, status)
        toast("Статус: ${ORDER_STATUSES[status]}")
        refresh()
    }

    private fun flightActions(f: Flight) {
        actions(
            "${f.number} ${f.from} → ${f.to}",
            "Пассажиры рейса" to { showPassengers(f) },
            "Продано билетов" to { showPaidCount(f) },
            "Выручка по рейсу" to { showRevenueFlight(f) },
            "Удалить из расписания" to {
                confirm("Удалить рейс ${f.number} (${f.date})?") {
                    safely { Core.removeFlight(f.id); toast("Рейс удалён"); refresh() }
                }
            },
        )
    }

    private fun clientActions(c: Client) {
        actions(
            c.name,
            "Редактировать данные" to { clientForm(c) },
            "Заявки клиента" to { showClientOrders(c) },
            "Новая заявка" to { orderForm(c.id) },
            "Удалить клиента" to {
                confirm("Удалить клиента ${c.name}?") { safely { Core.removeClient(c.id); refresh() } }
            },
        )
    }

    private fun airlineActions(a: Airline) {
        actions(
            a.name,
            "Рейсы авиакомпании" to { showAirlineFlights(a) },
            "Выручка авиакомпании" to { showRevenueAirline(a) },
            "Удалить авиакомпанию" to {
                confirm("Удалить авиакомпанию ${a.name}?") { safely { Core.removeAirline(a.id); refresh() } }
            },
        )
    }

    private fun onAdd() {
        when (current) {
            Tab.ORDERS -> orderForm(null)
            Tab.FLIGHTS -> flightForm()
            Tab.CLIENTS -> clientForm(null)
            Tab.AIRLINES -> airlineForm()
            Tab.QUERIES -> Unit
        }
    }

    // ------------------------------------------------------------------ формы (операции п. 4)

    private fun orderForm(presetClient: Int?) = safely {
        val clients = Core.clients()
        val flights = Core.flights()
        if (clients.isEmpty() || flights.isEmpty()) {
            toast("Сначала добавьте клиентов и рейсы")
            return@safely
        }
        val f = Form()
        val sClient = f.spinner("Клиент", clients.map { it.name })
        presetClient?.let { id -> sClient.setSelection(clients.indexOfFirst { it.id == id }.coerceAtLeast(0)) }
        val sFlight = f.spinner(
            "Рейс",
            flights.map { "${it.number} ${it.from} → ${it.to}, ${it.date} (своб. ${it.free})" },
        )
        val sClass = f.spinner("Класс обслуживания", SERVICE_CLASSES)
        f.show("Новая заявка", "Создать") {
            val id = Core.createOrder(
                clients[sClient.selectedItemPosition].id,
                flights[sFlight.selectedItemPosition].id,
                sClass.selectedItemPosition,
            )
            toast("Создана заявка №${id.trim()}")
            refresh()
        }
    }

    private fun flightForm() = safely {
        val airlines = Core.airlines()
        if (airlines.isEmpty()) {
            toast("Сначала добавьте авиакомпанию")
            return@safely
        }
        val f = Form()
        val number = f.edit("Номер рейса (напр. LO123)")
        val airline = f.spinner("Авиакомпания", airlines.map { "[${it.code}] ${it.name}" })
        val from = f.edit("Пункт вылета")
        val to = f.edit("Пункт назначения")
        val date = f.date("Дата вылета")
        val time = f.time("Время вылета")
        val type = f.spinner("Тип рейса", FLIGHT_TYPES)
        val seats = f.edit("Количество мест", InputType.TYPE_CLASS_NUMBER)
        val price = f.edit("Цена эконом-класса, zł", InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL)
        f.show("Новый рейс", "Добавить") {
            Core.addFlight(
                number.str(), airlines[airline.selectedItemPosition].id, from.str(), to.str(), date.str(),
                time.str(), type.selectedItemPosition, seats.str(), price.str(),
            )
            toast("Рейс добавлен в расписание")
            refresh()
        }
    }

    private fun clientForm(c: Client?) {
        val f = Form()
        val name = f.edit("ФИО", value = c?.name)
        val passport = f.edit("Номер паспорта", value = c?.passport)
        val phone = f.edit("Телефон", InputType.TYPE_CLASS_PHONE, c?.phone)
        val email = f.edit("E-mail", InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS or InputType.TYPE_CLASS_TEXT, c?.email)
        f.show(if (c == null) "Новый клиент" else "Редактирование клиента", "Сохранить") {
            if (c == null) Core.addClient(name.str(), passport.str(), phone.str(), email.str())
            else Core.editClient(c.id, name.str(), passport.str(), phone.str(), email.str())
            toast("Сохранено")
            refresh()
        }
    }

    private fun airlineForm() {
        val f = Form()
        val code = f.edit("Код ИАТА (напр. LO)")
        val name = f.edit("Название")
        val country = f.edit("Страна")
        f.show("Новая авиакомпания", "Добавить") {
            Core.addAirline(code.str(), name.str(), country.str())
            refresh()
        }
    }

    // ------------------------------------------------------------------ запросы (п. 3)

    private fun queryRows() = listOf(
        Row("1. Заявки клиента", "Список заявок по выбранному клиенту") {
            pickClient { showClientOrders(it) }
        },
        Row("2. Поиск рейсов", "По пункту назначения и дате вылета") { searchForm() },
        Row("3. Продано билетов на рейс", "Количество оплаченных заявок") { pickFlight { showPaidCount(it) } },
        Row("4. Рейсы авиакомпании", "Список рейсов выбранной авиакомпании") {
            pickAirline { showAirlineFlights(it) }
        },
        Row("5а. Выручка по рейсу", "Сумма оплаченных заявок") { pickFlight { showRevenueFlight(it) } },
        Row("5б. Выручка по авиакомпании", "Сумма оплаченных заявок по всем рейсам") {
            pickAirline { showRevenueAirline(it) }
        },
        Row("6. Пассажиры рейса", "Клиенты с забронированными и оплаченными билетами") {
            pickFlight { showPassengers(it) }
        },
    )

    private fun searchForm() {
        val f = Form()
        val to = f.edit("Пункт назначения")
        val date = f.date("Дата вылета")
        f.show("Поиск рейсов", "Найти") {
            val found = Core.searchFlights(to.str(), date.str())
            resultList("Рейсы в «${to.str()}» на ${date.str()}", found.map { flightRow(it) })
        }
    }

    private fun showClientOrders(c: Client) = safely {
        resultList("Заявки: ${c.name}", Core.ordersByClient(c.id).map { orderRow(it) })
    }

    private fun showAirlineFlights(a: Airline) = safely {
        resultList("Рейсы: ${a.name}", Core.flightsByAirline(a.id).map { flightRow(it) })
    }

    private fun showPassengers(fl: Flight) = safely {
        resultList(
            "Пассажиры ${fl.number} (${fl.date})",
            Core.passengers(fl.id).map {
                Row(it.name, "Паспорт ${it.passport} · ${SERVICE_CLASSES[it.cls]} · ${ORDER_STATUSES[it.status]}") {}
            },
        )
    }

    private fun showPaidCount(fl: Flight) = safely {
        message("${fl.number} ${fl.from} → ${fl.to}", "Продано (оплачено) билетов: ${Core.paidCount(fl.id)} из ${fl.seats}")
    }

    private fun showRevenueFlight(fl: Flight) = safely {
        message("${fl.number} ${fl.from} → ${fl.to}", "Выручка по рейсу: ${Core.revenueFlight(fl.id)} zł")
    }

    private fun showRevenueAirline(a: Airline) = safely {
        message(a.name, "Суммарная выручка: ${Core.revenueAirline(a.id)} zł")
    }

    private fun pickClient(onPick: (Client) -> Unit) = safely {
        val items = Core.clients()
        pick("Выберите клиента", items.map { it.name }) { onPick(items[it]) }
    }

    private fun pickFlight(onPick: (Flight) -> Unit) = safely {
        val items = Core.flights()
        pick("Выберите рейс", items.map { "${it.number} ${it.from} → ${it.to}, ${it.date}" }) { onPick(items[it]) }
    }

    private fun pickAirline(onPick: (Airline) -> Unit) = safely {
        val items = Core.airlines()
        pick("Выберите авиакомпанию", items.map { "[${it.code}] ${it.name}" }) { onPick(items[it]) }
    }

    // ------------------------------------------------------------------ диалоги

    private fun pick(title: String, items: List<String>, onPick: (Int) -> Unit) {
        if (items.isEmpty()) {
            toast("Список пуст")
            return
        }
        AlertDialog.Builder(this).setTitle(title)
            .setItems(items.toTypedArray()) { _, i -> onPick(i) }
            .setNegativeButton("Отмена", null).show()
    }

    private fun actions(title: String, vararg items: Pair<String, () -> Unit>) {
        AlertDialog.Builder(this).setTitle(title)
            .setItems(items.map { it.first }.toTypedArray()) { _, i -> items[i].second() }
            .setNegativeButton("Закрыть", null).show()
    }

    private fun resultList(title: String, rows: List<Row>) {
        if (rows.isEmpty()) {
            message(title, "Ничего не найдено")
            return
        }
        val text = rows.joinToString("\n\n") { "${it.title}\n${it.subtitle}" }
        AlertDialog.Builder(this).setTitle("$title (${rows.size})").setMessage(text).setPositiveButton("OK", null).show()
    }

    private fun message(title: String, text: String) {
        AlertDialog.Builder(this).setTitle(title).setMessage(text).setPositiveButton("OK", null).show()
    }

    private fun confirm(text: String, onYes: () -> Unit) {
        AlertDialog.Builder(this).setMessage(text)
            .setPositiveButton("Да") { _, _ -> onYes() }
            .setNegativeButton("Нет", null).show()
    }

    /** Форма ввода. При ошибке ядра диалог не закрывается, ошибка показывается внизу. */
    private inner class Form {
        val box = LinearLayout(this@MainActivity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(8), dp(20), 0)
        }
        private val error = TextView(this@MainActivity).apply {
            setTextColor(0xFFD32F2F.toInt())
            visibility = View.GONE
        }

        private fun label(text: String) {
            box.addView(TextView(this@MainActivity).apply {
                this.text = text
                setPadding(0, dp(8), 0, 0)
                textSize = 12f
            })
        }

        fun edit(hint: String, type: Int = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES, value: String? = null) =
            EditText(this@MainActivity).apply {
                this.hint = hint
                inputType = type
                setText(value ?: "")
                box.addView(this)
            }

        fun spinner(title: String, items: List<String>): Spinner {
            label(title)
            return Spinner(this@MainActivity).apply {
                adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, items)
                box.addView(this)
            }
        }

        fun date(hint: String): EditText = edit(hint).apply {
            isFocusable = false
            setOnClickListener {
                val c = Calendar.getInstance()
                DatePickerDialog(this@MainActivity, { _, y, m, d ->
                    setText(String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d))
                }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show()
            }
        }

        fun time(hint: String): EditText = edit(hint).apply {
            isFocusable = false
            setOnClickListener {
                TimePickerDialog(this@MainActivity, { _, h, m ->
                    setText(String.format(Locale.US, "%02d:%02d", h, m))
                }, 12, 0, true).show()
            }
        }

        fun show(title: String, okText: String, onOk: () -> Unit) {
            box.addView(error)
            val scroll = android.widget.ScrollView(this@MainActivity).apply { addView(box) }
            val dlg = AlertDialog.Builder(this@MainActivity).setTitle(title).setView(scroll)
                .setPositiveButton(okText, null).setNegativeButton("Отмена", null).create()
            dlg.setOnShowListener {
                dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                    try {
                        onOk()
                        dlg.dismiss()
                    } catch (e: CoreException) {
                        error.text = e.message
                        error.visibility = View.VISIBLE
                    }
                }
            }
            dlg.show()
        }
    }

    // ------------------------------------------------------------------ утилиты

    private fun EditText.str(): String = text.toString().trim()

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()

    private inline fun safely(block: () -> Unit) {
        try {
            block()
        } catch (e: Exception) {
            AlertDialog.Builder(this).setTitle("Ошибка").setMessage(e.message ?: e.toString())
                .setPositiveButton("OK", null).show()
        }
    }
}
