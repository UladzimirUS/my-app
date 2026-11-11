// Database.h — хранилище всех объектов, запросы и операции изменения состояния.
#pragma once

#include <istream>
#include <ostream>
#include <stdexcept>
#include <string>

#include "GenericList.h"
#include "Models.h"

// Ошибка бизнес-логики (сообщение показывается пользователю).
class AppError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

// Пассажир рейса: клиент + данные его заявки.
struct Passenger {
    Client client;
    Order order;
};

class Database {
public:
    // ---- обобщённые списки (п. 2 ТЗ) ----
    GenericList<Flight> flights;
    GenericList<Client> clients;
    GenericList<Order> orders;
    GenericList<Airline> airlines;

    // ---- поиск по id ----
    const Airline& airline(int id) const;
    const Flight& flight(int id) const;
    const Client& client(int id) const;
    const Order& order(int id) const;

    // Занятые (не отменённые заявки) и свободные места на рейсе.
    int occupiedSeats(int flightId) const;
    int freeSeats(int flightId) const;

    // ---- запросы (п. 3 ТЗ) ----
    GenericList<Order> ordersByClient(int clientId) const;                                    // 3.1
    GenericList<Flight> searchFlights(const std::string& destination, const std::string& date) const;  // 3.2
    int paidTicketsCount(int flightId) const;                                                 // 3.3
    GenericList<Flight> flightsByAirline(int airlineId) const;                                // 3.4
    double revenueByFlight(int flightId) const;                                               // 3.5
    double revenueByAirline(int airlineId) const;                                             // 3.5
    GenericList<Passenger> passengersOnFlight(int flightId) const;                            // 3.6

    // ---- операции изменения состояния (п. 4 ТЗ) ----
    int createOrder(int clientId, int flightId, ServiceClass cls);                            // 4.1
    void changeOrderStatus(int orderId, OrderStatus newStatus);                               // 4.2
    int addFlight(Flight f);                                                                  // 4.3
    void removeFlight(int flightId);                                                          // 4.3
    void editClient(const Client& c);                                                         // 4.4

    // ---- вспомогательные операции со справочниками ----
    int addAirline(Airline a);
    void removeAirline(int airlineId);
    int addClient(Client c);
    void removeClient(int clientId);

    // ---- файлы (п. 5 ТЗ) ----
    void saveToFile(const std::string& path) const;
    void loadFromFile(const std::string& path);

    void clear();
    void seedDemo();

    // Проверка ссылочной целостности после загрузки.
    void validateLinks() const;

    friend std::ostream& operator<<(std::ostream& os, const Database& db);
    friend std::istream& operator>>(std::istream& is, Database& db);

private:
    int nextAirlineId_ = 1;
    int nextFlightId_ = 1;
    int nextClientId_ = 1;
    int nextOrderId_ = 1;

    Flight& flightRef(int id);
    Client& clientRef(int id);
    Order& orderRef(int id);
    static bool canTransition(OrderStatus from, OrderStatus to);
    void validateFlight(const Flight& f) const;
    void validateClient(const Client& c) const;
    void recalcIds();
};
