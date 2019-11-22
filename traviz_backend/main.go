package main

import (
    "database/sql"
    "encoding/json"
    "flag"
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

type Dependency struct {
    Source string
    Destination string
}

type Swap struct {
    Src string `json:"src"`
    Dst string `json:"dst`
}

//Struct that represents the Config with which the server should be started
type Config struct {
    Dir string `json:"dir"`
    DB string `json:"db"`
    Username string `json:"username"`
    Password string `json:"pwd"`
    IP string `json:"ip"`
    Repo string `json:"repo"`
    Swaps []Swap `json:"swaps"`
}

type SourceCodeRow struct {
    Linenum int
    Fname string
    Count int
    Link string
}

type OverviewRow struct {
    ID string
    Duration uint64
    Date string
    NumEvents int
    Tags []string
}

type D3Node struct {
    Name string `json:"name"`
    Group int `json:"group"`
}

type D3Link struct {
    Source int `json:"source"`
    Target int `json:"target"`
    Weight int `json:"weight"`
}

type DependencyResponse struct {
    Nodes []D3Node
    Links []D3Link
}

type ErrorResponse struct {
    Error string
}

//Struct that represents the Server
type Server struct {
    DB *sql.DB
    Router *mux.Router
    Traces map[string]string
    Config Config
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

func processDependencies(trace XTrace) map[Dependency]int {
    depMap := make(map[Dependency]int)
    events := make(map[string]Event)
    for _, event := range trace.Events {
        events[event.EventID] = event
    }
    for _, e := range events {
        for _, parent := range e.Parents {
            parent_event := events[parent]
            if parent_event.ProcessName != e.ProcessName {
                dep := Dependency{Source: parent_event.ProcessName, Destination: e.ProcessName}
                if n, ok := depMap[dep]; !ok {
                    depMap[dep] = 1
                } else {
                    depMap[dep] = n + 1
                }
            }
        }
    }
    return depMap
}

func all_parents_seen(event Event, seen_events map[string]bool) bool {
    result := true
    for _, parent := range event.Parents {
        if _, ok := seen_events[parent]; ok {
            // This parent is already in the log. We can continue
            continue
        } else {
            // Add the current event to waiting events
            result = false
            break
        }
    }
    return result
}

func sort_events(events []Event) []Event {
    var sorted_events []Event
    seen_events := make(map[string]bool)
    var waiting_events []Event
    for _, event := range events {
        // Check if each parent has been seen before
        parents_seen := all_parents_seen(event, seen_events)
        if parents_seen {
            sorted_events = append(sorted_events, event)
            seen_events[event.EventID] = true
            // Check the waiting list
            for _, waiting_event := range waiting_events {
                // We have already marked this waiting_event as seen. #LazyRemoval
                if _, ok := seen_events[waiting_event.EventID]; ok {
                    continue
                }
                if all_parents_seen(waiting_event, seen_events) {
                    sorted_events = append(sorted_events, waiting_event)
                    seen_events[waiting_event.EventID] = true
                }
            }
        } else {
            waiting_events = append(waiting_events, event)
        }
    }
    return sorted_events
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
    server := Server{DB: db, Router:router, Traces: traces, Config: config}
    err = server.LoadTraces()
    if err != nil {
        return nil, err
    }
    err = server.LoadDependencies()
    if err != nil {
        return nil, err
    }
    server.routes()
    return &server, nil
}

func (s * Server) LoadDependencies() error {
    results, err := s.DB.Query("SELECT overview.trace_id, loc FROM overview, dependencies WHERE overview.trace_id = dependencies.trace_id")
    if err != nil {
        return err
    }
    locations := make(map[string]bool)
    seen_traces := make(map[string]bool)

    for results.Next() {
        var tid string
        var loc string
        err = results.Scan(&tid, &loc)
        if err != nil {
            return err
        }
        seen_traces[tid] = true
        locations[loc] = true
    }

    log.Println(len(locations))

    dep_stmtIns, err := s.DB.Prepare("INSERT INTO dependencies VALUES( ?, ?, ?, ?)")
    if err != nil {
        return err
    }
    defer dep_stmtIns.Close()

    var newTraces []XTrace
    err = filepath.Walk(s.Config.Dir, func(fp string, fi os.FileInfo, err error) error {
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
            if _, ok := locations[fp] ; !ok{
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
                if _, ok := seen_traces[traces[0].ID]; !ok {
                    // This trace is not in the database yet
                    seen_traces[traces[0].ID] = true
                    newTraces = append(newTraces, traces[0])
                }
            }
        }
        return nil
    })
    if err != nil {
        return err
    }
    log.Println("New traces to be processed for dependencies :", len(newTraces))
    for _, trace := range newTraces {
        deps := processDependencies(trace)
        for dep, num := range deps {
            _, err = dep_stmtIns.Exec( trace.ID, dep.Source, dep.Destination, num)
            if err != nil {
                log.Println("Error Executing", trace.ID, s.Traces[trace.ID])
                return err
            }
        }
    }
    return nil
}

//Checks and loads any new traces that are available
func (s * Server) LoadTraces() error {
    results, err := s.DB.Query("SELECT trace_id, loc FROM overview;")
    locations := make(map[string]bool)
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
        locations[loc] = true
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
    err = filepath.Walk(s.Config.Dir, func(fp string, fi os.FileInfo, err error) error {
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
            if _, ok := locations[fp] ; !ok{
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

func setupResponse(w *http.ResponseWriter, r *http.Request) {
    (*w).Header().Set("Access-Control-Allow-Origin", "*")
    (*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
    (*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

//Returns the overview of the traces
func (s * Server) Overview(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    rows, err := s.DB.Query("SELECT overview.trace_id, overview.doc, overview.duration, overview.num_events FROM overview")
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        return
    }
    var responseRows []OverviewRow
    for rows.Next() {
        var responseRow OverviewRow
        err = rows.Scan(&responseRow.ID, &responseRow.Date, &responseRow.Duration, &responseRow.NumEvents)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            return
        }
        tagRows, err :=  s.DB.Query("SELECT tag FROM tags WHERE trace_id=?", responseRow.ID)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            return
        }
        for tagRows.Next() {
            var tag string
            tagRows.Scan(&tag)
            responseRow.Tags = append(responseRow.Tags, tag)
        }
        responseRows = append(responseRows, responseRow)
    }
    log.Println("Sending", len(responseRows), "rows")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(responseRows)
}

func (s *Server) GetTrace(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    params := mux.Vars(r)
    if len(params) != 1 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Request"})
        return
    }
    traceID := params["id"]
    if v, ok := s.Traces[traceID]; !ok {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID"})
        return
    } else {
        var traces []XTrace
        f, err := os.Open(v)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        }
        defer f.Close()
        dec := json.NewDecoder(f)
        err = dec.Decode(&traces)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        }
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(sort_events(traces[0].Events))
    }
}

func (s *Server) SourceCode(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    rows, err := s.DB.Query("SELECT fname,linenum,SUM(num) FROM sourcecode GROUP BY fname,linenum")
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        return
    }
    var responseRows []SourceCodeRow
    for rows.Next() {
        var responseRow SourceCodeRow
        err = rows.Scan(&responseRow.Fname, &responseRow.Linenum, &responseRow.Count)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            return
        }
        for _, swap := range s.Config.Swaps {
            responseRow.Fname = strings.Replace(responseRow.Fname, swap.Src, swap.Dst, 1)
        }
        responseRow.Link = s.Config.Repo + responseRow.Fname + "#L" + strconv.Itoa(responseRow.Linenum)
        responseRow.Fname = filepath.Base(responseRow.Fname)
        responseRows = append(responseRows, responseRow)
    }
    log.Println("Sending", len(responseRows), "rows")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(responseRows)
}

func (s * Server) Dependency(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    log.Println(r)
    w.Header().Set("Content-Type", "application/json")
    rows, err := s.DB.Query("SELECT source,destination,SUM(num) FROM dependencies GROUP BY source,destination")
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        return
    }
    depMap := make(map[Dependency]int)
    for rows.Next() {
        var dep Dependency
        var num int
        err = rows.Scan(&dep.Source, &dep.Destination, &num)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            return
        }
        depMap[dep] = num
    }
    ids := make(map[string]int)
    curr_id := 0
    var nodes []D3Node
    var links []D3Link
    for dep, v := range depMap{
        if _, ok := ids[dep.Source]; !ok{
            node := D3Node{Name: dep.Source, Group:1}
            ids[dep.Source] = curr_id
            curr_id += 1
            nodes = append(nodes, node)
        }
        if _, ok := ids[dep.Destination]; !ok {
            node := D3Node{Name: dep.Destination, Group:1}
            ids[dep.Destination] = curr_id
            curr_id += 1
            nodes = append(nodes, node)
        }
        link := D3Link{Source: ids[dep.Source], Target: ids[dep.Destination], Weight: v}
        links = append(links, link)
    }
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(&DependencyResponse{Nodes: nodes, Links: links})
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
