cmake_minimum_required(VERSION 3.22.1)
project(aviacore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(aviacore SHARED
        Models.cpp
        Database.cpp
        CommandApi.cpp
        jni_bridge.cpp)

target_compile_options(aviacore PRIVATE -Wall -Wextra)
target_link_libraries(aviacore log)
