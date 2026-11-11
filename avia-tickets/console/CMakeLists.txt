# Сборка консольной версии: cmake -S console -B build && cmake --build build
cmake_minimum_required(VERSION 3.16)
project(avia_console LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CORE ${CMAKE_CURRENT_SOURCE_DIR}/../app/src/main/cpp)
add_executable(avia main.cpp ${CORE}/Models.cpp ${CORE}/Database.cpp ${CORE}/CommandApi.cpp)
target_include_directories(avia PRIVATE ${CORE})
