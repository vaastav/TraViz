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
    "github.com/vaastav/TraViz/traviz_backend/xtrace"
    "github.com/vaastav/TraViz/traviz_backend/kernel"
    _ "github.com/go-sql-driver/mysql"
)

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
    ID string `json:"id"`
    Group int `json:"group"`
    Size int `json:"size"`
}

type D3Link struct {
    Source string `json:"source"`
    Target string `json:"target"`
    Weight int `json:"weight"`
}

type D3XTraceNode struct {
    ID string `json:"id"`
    Group int `json:"group"`
    Event xtrace.Event `json:"data"`
}

type D3XTraceLink struct {
    Source string `json:"source"`
    Target string `json:"target"`
}

type D3AggNode struct {
    ID string `json:"id"`
    Value float64 `json:value`
    Event xtrace.Event `json:"data"`
}

type D3AggLink struct {
    Source string `json:"source"`
    Target string `json:"target"`
}

type DependencyResponse struct {
    Nodes []D3Node `json:"nodes"`
    Links []D3Link `json:"links"`
}

type ComparisonResponse struct {
    Nodes []D3XTraceNode `json:"nodes"`
    Links []D3XTraceLink `json:"links"`
}

type AggregationResponse struct {
    Nodes []D3AggNode `json:"nodes"`
    Links []D3AggLink `json:"links"`
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
func processTrace(trace xtrace.XTrace) TraceStats {
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

func processDependencies(trace xtrace.XTrace) map[Dependency]int {
    depMap := make(map[Dependency]int)
    events := make(map[string]xtrace.Event)
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

func compare2Traces(trace1 xtrace.XTrace, trace2 xtrace.XTrace) ComparisonResponse {
    graph1 := kernel.GraphFromXTrace(trace1)
    graph2 := kernel.GraphFromXTrace(trace2)

    wlKernel := kernel.NewWLKernel(5)
    results := wlKernel.CalculateNodeStability(*graph1, *graph2, "both")
    var nodes []D3XTraceNode
    var links []D3XTraceLink

    // Group 1: Only in Graph 1
    // Group 2: Only in Graph 2
    // Group 3: Same
    seenNodes := make(map[string]bool)
    for id, node := range graph1.Nodes {
        event := node.Event
        group := 3
        if results[0].Scores[id] <= 0.5 {
            group = 1
        }
        d3Node := D3XTraceNode{ID: id, Group: group, Event: event}
        nodes = append(nodes, d3Node)
        seenNodes[id] = true
    }

    for id, node := range graph2.Nodes {
        event := node.Event
        group := 3
        if results[1].Scores[id] <= 0.5 {
            group = 2
        }
        d3Node := D3XTraceNode{ID: id, Group: group, Event: event}
        nodes = append(nodes, d3Node)
        seenNodes[id] = true
    }

    for id := range graph1.Parents {
        for _, pid := range graph1.Parents[id] {
            link := D3XTraceLink{Source: pid, Target: id}
            if _, ok := seenNodes[pid]; !ok {
                log.Println("Unseen nodeID :", pid)
                newNode := D3XTraceNode{ID: pid, Group: 1, Event: xtrace.Event{}}
                nodes = append(nodes, newNode)
            }
            links = append(links, link)
        }
    }

    for id := range graph2.Parents {
        for _, pid := range graph2.Parents[id] {
            link := D3XTraceLink{Source: pid, Target: id}
            if _, ok := seenNodes[pid]; !ok {
                log.Println("Unseen nodeID :", pid)
                newNode := D3XTraceNode{ID: pid, Group: 2, Event: xtrace.Event{}}
                nodes = append(nodes, newNode)
            }
            links = append(links, link)
        }
    }
    return ComparisonResponse{Nodes: nodes, Links: links}
}

func aggregate(traces []xtrace.XTrace) AggregationResponse {
    nodesChildren := make(map[string][]string)
    nodeCount := make(map[string]int)
    total_traces := len(traces)
    allNodes := make(map[string]xtrace.Event)
    hashes := make(map[string]string)
    revHashes := make(map[string]string)
    for _, trace := range traces {
        for _, event := range trace.Events {
            allNodes[event.EventID] = event
            hash := event.GetHashString()
            if v, ok := nodeCount[hash]; !ok {
                nodeCount[hash] = 1
            } else {
                nodeCount[hash] = v + 1
            }
            hashes[event.EventID] = hash
            hashes[hash] = event.EventID
        }
    }

    for node, event := range allNodes {
        hash := hashes[node]
        for _, parent := range event.Parents {
            parentHash := hashes[parent]
            if v, ok := nodesChildren[parentHash]; !ok {
                nodesChildren[parentHash] = []string{hash}
            } else {
                nodesChildren[parentHash] = append(v, hash)
            }
        }
    }

    var nodes []D3AggNode
    var links []D3AggLink
    for nodeID, count := range nodeCount {
        value := float64(count) / float64(total_traces)
        event := allNodes[revHashes[nodeID]]
        node := D3AggNode{ID: nodeID, Value: value, Event: event}
        nodes = append(nodes, node)
        if children, ok := nodesChildren[nodeID]; ok {
            for _, child := range children {
                link := D3AggLink{Source: nodeID, Target: child}
                links = append(links, link)
            }
        }
    }
    return AggregationResponse{Nodes: nodes, Links: links}
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

    var newTraces []xtrace.XTrace
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
                var traces []xtrace.XTrace
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

    var newTraces []xtrace.XTrace
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
                var traces []xtrace.XTrace
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
    s.Router.HandleFunc("/compare/{id1}/{id2}", s.CompareOneVsOne)
    s.Router.HandleFunc("/compare/1vmany", s.CompareOneVsMany)
    s.Router.HandleFunc("/compare/manyvmany", s.CompareManyVsMany)
    s.Router.HandleFunc("/aggregate", s.Aggregate)
    s.Router.HandleFunc("/traces", s.FilterTraces)
    s.Router.HandleFunc("/tags", s.Tags)
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

func (s * Server) CompareOneVsMany(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(&ErrorResponse{Error: "Not Implemented"})
}

func (s * Server) CompareManyVsMany(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(&ErrorResponse{Error: "Not Implemented"})
}

func (s * Server) CompareOneVsOne(w http.ResponseWriter, r *http.Request) {
    log.Println(r)
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")
    params := mux.Vars(r)
    if len(params) != 2 {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Request"})
        return
    }
    traceID1 := params["id1"]
    traceID2 := params["id2"]
    var file1 string
    var file2 string
    if v, ok := s.Traces[traceID1]; !ok {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID: " + traceID1})
        return
    } else {
        file1 = v
    }
    if v, ok := s.Traces[traceID2]; !ok {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID: " + traceID2})
        return
    } else {
        file2 = v
    }
    var traces1 []xtrace.XTrace
    var traces2 []xtrace.XTrace
    var trace1 xtrace.XTrace
    var trace2 xtrace.XTrace
    f1, err := os.Open(file1)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
    }
    defer f1.Close()
    dec := json.NewDecoder(f1)
    err = dec.Decode(&traces1)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
    }
    trace1 = traces1[0]
    f2, err := os.Open(file2)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
    }
    defer f2.Close()
    dec = json.NewDecoder(f2)
    err = dec.Decode(&traces2)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
    }
    trace2 = traces2[0]
    response := compare2Traces(trace1, trace2)
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(response)
}

func (s *Server) GetTrace(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
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
        var traces []xtrace.XTrace
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
        json.NewEncoder(w).Encode(xtrace.Sort_events(traces[0].Events))
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


    depCount := make(map[string]int)
    ids := make(map[string]int)
    curr_id := 0
    var nodes []D3Node
    var links []D3Link
    for dep, v := range depMap{
        if _, ok := ids[dep.Source]; !ok{
            node := D3Node{ID: dep.Source, Group:1}
            ids[dep.Source] = curr_id
            curr_id += 1
            depCount[dep.Source] = 1
            nodes = append(nodes, node)
        } else {
            depCount[dep.Source] += 1
        }
        if _, ok := ids[dep.Destination]; !ok {
            node := D3Node{ID: dep.Destination, Group:1}
            ids[dep.Destination] = curr_id
            curr_id += 1
            nodes = append(nodes, node)
        }
        link := D3Link{Source: dep.Source, Target: dep.Destination, Weight: v}
        links = append(links, link)
    }

    var sizedNodes []D3Node
    for _, node := range nodes {
        node.Size = depCount[node.ID]
        sizedNodes = append(sizedNodes, node)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(&DependencyResponse{Nodes: sizedNodes, Links: links})
}

func (s * Server) Aggregate(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")
    q := r.URL.Query()
    log.Println(q)

    var xtraces []xtrace.XTrace

    if traces_resp, ok := q["traces"]; !ok {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Request"})
        return
    } else {
        traces := strings.Split(traces_resp[0], ",")
        if (len(traces)) < 2 {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Too few traces selected"})
            return
        }
        for _, traceID := range traces {
            var file1 string
            if v, ok := s.Traces[traceID]; !ok {
                w.WriteHeader(http.StatusBadRequest)
                json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID: " + traceID})
                return
            } else {
                file1 = v
            }
            var traces1 []xtrace.XTrace
            var trace1 xtrace.XTrace
            f1, err := os.Open(file1)
            if err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            }
            defer f1.Close()
            dec := json.NewDecoder(f1)
            err = dec.Decode(&traces1)
            if err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
            }
            trace1 = traces1[0]
            xtraces = append(xtraces, trace1)
        }
    }

    response := aggregate(xtraces)

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(&response)
}

func (s * Server) FilterTraces(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")
    log.Println(r)
    q := r.URL.Query()

    log.Println(q)
    if (len(q) == 0) {

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
        return
    }
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(&ErrorResponse{Error: "Not Implemented"})
}

func (s * Server) Tags(w http.ResponseWriter, r *http.Request) {
    setupResponse(&w, r)
    w.Header().Set("Content-Type", "application/json")
    rows, err := s.DB.Query("SELECT DISTINCT tag FROM tags")
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
    }
    var tags []string

    for rows.Next() {
        var tag string
        err = rows.Scan(&tag)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
        }
        tags = append(tags, tag)
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(tags)
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
