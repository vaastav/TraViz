package main

import (
    "log"
    "fmt"
    "net/http"

    "github.com/gorilla/mux"
)


//Returns the overview of the traces
func overview(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Welcome home!")
}


func main() {
    router := mux.NewRouter().StrictSlash(true)
    router.HandleFunc("/overview", overview)
    log.Fatal(http.ListenAndServe(":9000", router))
}
