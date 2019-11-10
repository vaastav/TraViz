package main

import (
    "encoding/json"
    "flag"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "github.com/gorilla/mux"
)


type Config struct {
    Dir string `json:"dir"`
    Cache string `json:"cache"`
}


func VisitFile(fp string, fi os.FileInfo, err error) error {
    if err != nil {
        log.Println(err)
        return nil
    }
    if fi.IsDir() {
        return nil
    }

    matched, err :=  filepath.Match("*.json", fi.Name())
    if err != nil {
        log.Fatal(err)
    }
    if matched {
        fmt.Println(fp)
    }

    return nil
}

func parseConfig(filename string) (Config, error) {
    jsonFile, err := os.Open(filename)
    if err != nil {
        return Config{}, err
    }

    defer jsonFile.Close()

    bytes, err := ioutil.ReadAll(jsonFile)
    if err != nil {
        return Config{}, err
    }

    var config Config
    json.Unmarshal(bytes, &config)
    return config, nil
}

func buildState(config Config) error {
    filepath.Walk(config.Dir, VisitFile)
}

//Returns the overview of the traces
func overview(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Welcome home!")
}


func main() {
    configPtr := flag.String("config", "", "Path to config file")

    flag.Parse()

    log.Println("Parsing config file")
    config, err := parseConfig(*configPtr)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Building State using the config")
    err = buildState(config)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Starting server now")

    router := mux.NewRouter().StrictSlash(true)
    router.HandleFunc("/overview", overview)
    log.Fatal(http.ListenAndServe(":9000", router))
}