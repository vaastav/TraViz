package main

import (
    "database/sql"
    "encoding/json"
    "flag"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "github.com/gorilla/mux"
    _ "github.com/go-sql-driver/mysql"
)


type Config struct {
    Dir string `json:"dir"`
    DB string `json:"db"`
    Username string `json:"username"`
    Password string `json:"pwd"`
    IP string `json:"ip"`
}

type Server struct {
    DB *sql.DB
    Router *mux.Router
    Traces map[string]string
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

func setupServer(config Config) (*Server, error) {
    connString := config.Username + ":" + config.Password + "@tcp(127.0.0.1:3306)/" + config.DB
    db, err := sql.Open("mysql", connString)
    if err != nil {
        return nil, err
    }
    err = db.Ping()
    if err != nil {
        return nil, err
    }
    log.Println("Database connection setup")
    router := mux.NewRouter().StrictSlash(true)
    traces := make(map[string]string)
    server := Server{DB: db, Router:router, Traces: traces}
    server.routes()
    //filepath.Walk(config.Dir, VisitFile)
    return &server, nil
}

//Setup the various API endpoints for this server
func (s * Server) routes() {
    s.Router.HandleFunc("/", s.Overview)
    s.Router.HandleFunc("/overview", s.Overview)
}

//Returns the overview of the traces
func (s * Server) Overview(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
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

    log.Println("Setting up server")
    server, err := setupServer(config)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Starting server now")

    log.Fatal(http.ListenAndServe(config.IP, server.Router))
}
