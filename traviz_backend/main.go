package main

import (
    "database/sql"
    "encoding/json"
    "flag"
    "fmt"
    "io/ioutil"
    "log"
    "math"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
    "strings"
    "time"
    "github.com/gorilla/mux"
    _ "github.com/go-sql-driver/mysql"
)

// Represents an event in the trace. Currently, only a subset of the fields are parsed
// which are relevant to TraViz
type Event struct {
    ProcessName string `json:"ProcessName"`
    Label string `json:Label"`
    Timestamp int64 `json:"Timestamp"`
    HRT uint64 `json:"HRT"`
    EventID string `json:"EventID"`
    Parents []string `json:"ParentEventID"`
    ThreadID int `json:"ThreadID"`
    Agent string `json:"Agent"`
    ProcessID int `json:"ProcessID"`
    Tags []string `json:"Tag"`
    Source string `json:"Source"`
    Host string `json:"Host"`
    Cycles int `json:"Cycles"`
}

//Struct that represents an XTrace. This corresponds to XTraceV4
type XTrace struct {
    ID string `json:"id"`
    Events []Event `json:"reports"`
}

//Struct that represents the statistics to be collected when the trace is
//processed to be inserted into the sql database
type TraceStats struct {
    Duration uint64
    DOC time.Time
    NumEvents int
    Tags []string
    Source map[string]int
}

//Struct that represents the Config with which the server should be started
type Config struct {
    Dir string `json:"dir"`
    DB string `json:"db"`
    Username string `json:"username"`
    Password string `json:"pwd"`
    IP string `json:"ip"`
}

//Struct that represents the Server
type Server struct {
    DB *sql.DB
    Router *mux.Router
    Traces map[string]string
    Dir string
}

//Processes a given XTrace and returns the statistics collected
//for the given trace
func processTrace(trace XTrace) TraceStats {
    var earliest_timestamp int64
    var earliest_time_hrt uint64
    earliest_time_hrt = math.MaxUint64
    var latest_time_hrt uint64
    var tags []string
    sourceMap := make(map[string]int)
    for _ ,event := range trace.Events {
        if event.HRT < earliest_time_hrt {
            earliest_time_hrt = event.HRT
            earliest_timestamp = event.Timestamp
        }
        if event.HRT > latest_time_hrt {
            latest_time_hrt = event.HRT
        }
        for _ , tag := range event.Tags {
            tags = append(tags, tag)
        }
        if v, ok := sourceMap[event.Source]; !ok {
            sourceMap[event.Source] = 1
        } else {
            sourceMap[event.Source] = v + 1
        }
    }
    duration := latest_time_hrt - earliest_time_hrt
    doc := time.Unix(0, earliest_timestamp * 1000000)
    return TraceStats{Duration: duration, DOC: doc, NumEvents: len(trace.Events), Tags: tags, Source: sourceMap}
}

//Parses config from a json file and returns the parsed Config struct
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

//Sets up the server with the given config
//Also updates the database if the database needs to be updated
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
    traces := make(map[string]string)
    router := mux.NewRouter().StrictSlash(true)
    server := Server{DB: db, Router:router, Traces: traces, Dir: config.Dir}
    err = server.LoadTraces()
    if err != nil {
        return nil, err
    }
    server.routes()
    return &server, nil
}

//Checks and loads any new traces that are available
func (s * Server) LoadTraces() error {
    results, err := s.DB.Query("SELECT trace_id, loc FROM overview;")
    if err != nil {
        return err
    }

    for results.Next() {
        var tid string
        var loc string
        err = results.Scan(&tid, &loc)
        if err != nil {
            return err
        }
        s.Traces[tid] = loc
    }

    overview_stmtIns, err := s.DB.Prepare("INSERT INTO overview VALUES( ?, ?, ?, ?, ? )")
    if err != nil {
        return err
    }
    defer overview_stmtIns.Close()
    tags_stmtIns, err := s.DB.Prepare("INSERT INTO tags VALUES( ?, ? )")
    if err != nil {
        return err
    }
    defer tags_stmtIns.Close()
    srccode_stmtIns, err := s.DB.Prepare("INSERT INTO sourcecode VALUES( ?, ?, ?, ? )")

    var newTraces []XTrace
    err = filepath.Walk(s.Dir, func(fp string, fi os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        if fi.IsDir() {
            return nil
        }

        matched, err :=  filepath.Match("*.json", fi.Name())
        if err != nil {
            log.Fatal(err)
        }
        if matched {
            var traces []XTrace
            f, err := os.Open(fp)
            if err != nil {
                return err
            }
            defer f.Close()
            dec := json.NewDecoder(f)
            err = dec.Decode(&traces)
            if err != nil {
                return err
            }
            if len(traces) != 1 {
                //Multiple traces in 1 file not handled yet
                return nil
            }
            if _, ok := s.Traces[traces[0].ID]; !ok {
                // This trace is not in the database yet
                s.Traces[traces[0].ID] = fp
                newTraces = append(newTraces, traces[0])
            }
        }
        return nil
    })
    if err != nil {
        return err
    }
    log.Println("New traces to be processed", len(newTraces))
    const createdFormat = "2006-01-02 15:04:05"
    for _, trace := range newTraces {
        log.Println("Processing", trace.ID)
        stats := processTrace(trace)
        _, err = overview_stmtIns.Exec( trace.ID, stats.Duration, stats.DOC.Format(createdFormat), s.Traces[trace.ID], stats.NumEvents)
        if err != nil {
            log.Println("Error Executing", trace.ID, s.Traces[trace.ID])
            return err
        }
        for _, tag := range stats.Tags {
            _, err = tags_stmtIns.Exec( trace.ID, tag)
            if err != nil {
                return err
            }
        }
        for source, val := range stats.Source {
            if source == " " || source == "" {
                continue
            }
            tokens := strings.Split(source, ":")
            linenum, err := strconv.Atoi(tokens[1])
            if err != nil {
                return err
            }
            fname := tokens[0]
            _, err = srccode_stmtIns.Exec( trace.ID, linenum, fname, val)
            if err != nil {
                return err
            }
        }
    }
    return nil
}

//Setup the various API endpoints for this server
func (s * Server) routes() {
    s.Router.HandleFunc("/", s.Overview)
    s.Router.HandleFunc("/overview", s.Overview)
    s.Router.HandleFunc("/traces/{id}", s.GetTrace)
    s.Router.HandleFunc("/source", s.SourceCode)
    s.Router.HandleFunc("/dependency", s.Dependency)
}

//Returns the overview of the traces
func (s * Server) Overview(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "Welcome home!")
}

func (s *Server) GetTrace(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    params := mux.Vars(r)
    if len(params) != 1 {
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprintf(w, "Invalid Request\n")
        return
    }
    traceID := params["id"]
    if v, ok := s.Traces[traceID]; !ok {
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprintf(w, "Invalid Trace ID\n")
        return
    } else {
        var traces []XTrace
        f, err := os.Open(v)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Fprintf(w, "Internal Server Error\n")
        }
        defer f.Close()
        dec := json.NewDecoder(f)
        err = dec.Decode(&traces)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            fmt.Fprintf(w, "Internal Server Error\n")
        }
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(traces[0])
    }
}

func (s *Server) SourceCode(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "Not Implemented Yet!\n")
}

func (s * Server) Dependency(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "Not Implemented Yet!\n")
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
