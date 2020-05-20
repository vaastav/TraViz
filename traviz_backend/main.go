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

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"
	"github.com/vaastav/TraViz/traviz_backend/kernel"
	"github.com/vaastav/TraViz/traviz_backend/xtrace"
)

//Struct that represents the statistics to be collected when the trace is
//processed to be inserted into the sql database
type TraceStats struct {
	Duration  uint64
	DOC       time.Time
	NumEvents int
	Tags      []string
	Source    map[string]int
}

type Dependency struct {
	Source      string
	Destination string
}

type Span struct {
	TraceID      string
	SpanID       string
	Duration     uint64
	Operation    string
	Source       string
	ProcessName  string
	ProcessID    int
	ThreadID     int
	StartTime    time.Time
	EndTime      time.Time
	Events       []xtrace.Event
	ParentSpanID string
}

type Swap struct {
	Src string `json:"src"`
	Dst string `json:"dst"`
}

type SourceTask struct {
	Source   string `json:"source"`
	TaskName string `json:"task"`
}

type Tasks struct {
	LOTasks []SourceTask `json:"tasks"`
}

//Struct that represents the Config with which the server should be started
type Config struct {
	Dir       string `json:"dir"`
	DB        string `json:"db"`
	Username  string `json:"username"`
	Password  string `json:"pwd"`
	IP        string `json:"ip"`
	Repo      string `json:"repo"`
	Swaps     []Swap `json:"swaps"`
	TasksFile string `json:"tasks_file"`
}

type SourceCodeRow struct {
	Linenum int
	Fname   string
	Count   int
	Link    string
}

type OverviewRow struct {
	ID        string
	Duration  uint64
	Date      string
	NumEvents int
	Tags      []string
}

type ConcurrentTask struct {
	Start int64
	End   int64
}

type MoleHillTask struct {
	Start     time.Time
	End       time.Time
	ProcName  string
	ProcID    int
	Operation string
}

type TaskRow struct {
	Operation    string
	ProcessName  string
	ProcessID    int
	ThreadID     int
	Duration     uint64
	Data         []uint64
	MolehillData []ConcurrentTask
}

type LinkRow struct {
	Src_ID        string
	Dst_ID        string
	Src_Operation string
	Dst_Operation string
	Percentage    float64
}

type D3Node struct {
	ID    string `json:"id"`
	Group int    `json:"group"`
	Size  int    `json:"size"`
}

type D3Link struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Weight int    `json:"weight"`
}

type D3XTraceNode struct {
	ID    string       `json:"id"`
	Group int          `json:"group"`
	Event xtrace.Event `json:"data"`
}

type D3XTraceLink struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type D3AggNode struct {
	ID    string       `json:"id"`
	Value float64      `json:"value"`
	Event xtrace.Event `json:"data"`
}

type D3AggLink struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type D3Event struct {
	ProcessName string   `json:"ProcessName"`
	Label       string   `json:Label"`
	Timestamp   int64    `json:"Timestamp"`
	HRT         uint64   `json:"HRT"`
	EventID     string   `json:"EventID"`
	Parents     []string `json:"ParentEventID"`
	ThreadID    int      `json:"ThreadID"`
	Agent       string   `json:"Agent"`
	ProcessID   int      `json:"ProcessID"`
	Tags        []string `json:"Tag"`
	Source      string   `json:"Source"`
	Host        string   `json:"Host"`
	Cycles      int      `json:"Cycles"`
	Probability float64  `json:"Probability"`
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

type TraceResult struct {
	ID    string
	Trace float64
	Event float64
}

type TaskResult struct {
	ID   string
	Task float64
}

type LinkResult struct {
	ID   string
	Link float64
}

//Struct that represents the Server
type Server struct {
	DB                      *sql.DB
	Router                  *mux.Router
	Traces                  map[string]string
	Config                  Config
	TotalTaskCounts         map[string]int
	TotalRelationshipCounts map[string]int
	TagCounts               map[string]int
	TraceResults            []TraceResult
	TaskResults             []TaskResult
	LinkResults             []LinkResult
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
	for _, event := range trace.Events {
		if event.HRT < earliest_time_hrt {
			earliest_time_hrt = event.HRT
			earliest_timestamp = event.Timestamp
		}
		if event.HRT > latest_time_hrt {
			latest_time_hrt = event.HRT
		}
		for _, tag := range event.Tags {
			tags = append(tags, tag)
		}
		if v, ok := sourceMap[event.Source]; !ok {
			sourceMap[event.Source] = 1
		} else {
			sourceMap[event.Source] = v + 1
		}
	}
	duration := latest_time_hrt - earliest_time_hrt
	doc := time.Unix(0, earliest_timestamp*1000000)
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

func processSpan(events []xtrace.Event, traceID string, key string, rev_event_map map[string]string) Span {
	var span Span

	var duration uint64
	var operationName string
	var eventID string
	var earliest_time_hrt uint64
	earliest_time_hrt = math.MaxUint64
	var latest_time_hrt uint64
	var last_event_id string
	var source string
	var earliest_timestamp int64
	var latest_timestamp int64
	var parentSpanID string

	for _, event := range events {
		if event.HRT < earliest_time_hrt {
			earliest_time_hrt = event.HRT
			earliest_timestamp = event.Timestamp
			eventID = event.EventID
			source = event.Source
			for _, parent_event := range event.Parents {
				if v, ok := rev_event_map[parent_event]; ok {
					if v != key {
						parentSpanID = v
					}
				}
			}
		}
		if event.HRT > latest_time_hrt {
			latest_time_hrt = event.HRT
			latest_timestamp = event.Timestamp
			last_event_id = event.EventID
		}
		label := event.Label
		if strings.Contains(label, "::") {
			pieces := strings.Split(label, "::")
			if pieces[0] != "ThreadLocalBaggage" {
				opNamePieces := strings.Split(pieces[1], " ")
				operationName = pieces[0] + "::" + opNamePieces[0]
			}
		}
	}
	duration = latest_time_hrt - earliest_time_hrt
	pieces := strings.Split(key, ":")

	span.Duration = duration
	span.TraceID = traceID
	span.SpanID = eventID + "-" + last_event_id
	span.Operation = operationName
	span.Source = source
	span.ProcessName = pieces[0]
	span.ProcessID, _ = strconv.Atoi(pieces[1])
	span.ThreadID, _ = strconv.Atoi(pieces[2])
	span.StartTime = time.Unix(0, earliest_timestamp*1000000)
	span.EndTime = time.Unix(0, latest_timestamp*1000000)
	span.Events = events
	span.ParentSpanID = parentSpanID

	return span
}

func processSpans(trace xtrace.XTrace) map[string]Span {
	id := trace.ID
	spans := make(map[string][]xtrace.Event)
	// Maps each event to the span ID
	rev_event_map := make(map[string]string)
	for _, event := range trace.Events {
		key := event.ProcessName + ":" + strconv.Itoa(event.ProcessID) + ":" + strconv.Itoa(event.ThreadID)
		rev_event_map[event.EventID] = key
		if v, ok := spans[key]; !ok {
			spans[key] = []xtrace.Event{event}
		} else {
			v = append(v, event)
			spans[key] = v
		}
	}

	spanInfos := make(map[string]Span)
	// Maps key to calculate spanID so that we can fix parent span IDs.
	spanIDs := make(map[string]string)
	for key, events := range spans {
		span := processSpan(events, id, key, rev_event_map)
		spanIDs[key] = span.SpanID
		spanInfos[key] = span
	}

	// Correctly reset parent spanIDs
	for key, span := range spanInfos {
		span.ParentSpanID = spanIDs[span.ParentSpanID]
		spanInfos[key] = span
	}

	return spanInfos
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
			revHashes[hash] = event.EventID
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
	seenLinks := make(map[string]bool)
	for nodeID, count := range nodeCount {
		value := float64(count) / float64(total_traces)
		event := allNodes[revHashes[nodeID]]
		node := D3AggNode{ID: nodeID, Value: value, Event: event}
		nodes = append(nodes, node)
		if children, ok := nodesChildren[nodeID]; ok {
			for _, child := range children {
				linkID := nodeID + "+" + child
				if _, ok := seenLinks[linkID]; !ok {
					link := D3AggLink{Source: nodeID, Target: child}
					links = append(links, link)
					seenLinks[linkID] = true
				}
			}
		}
	}
	return AggregationResponse{Nodes: nodes, Links: links}
}

func parseTasksFile(filename string) (map[string]string, error) {
	jsonFile, err := os.Open(filename)
	if err != nil {
		return nil, err
	}

	defer jsonFile.Close()

	bytes, err := ioutil.ReadAll(jsonFile)
	if err != nil {
		return nil, err
	}

	var tasks Tasks
	json.Unmarshal(bytes, &tasks)
	task_map := make(map[string]string)
	for _, task := range tasks.LOTasks {
		task_map[task.Source] = task.TaskName
	}

	return task_map, nil
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
	connString := config.Username + ":" + config.Password + "@tcp(127.0.0.1:3306)/" + config.DB + "?parseTime=true"
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
	server := Server{DB: db, Router: router, Traces: traces, Config: config}
	err = server.LoadTraces()
	if err != nil {
		return nil, err
	}
	err = server.InsertSpanTimes()
	if err != nil {
		return nil, err
	}
	err = server.LoadTaskCounts()
	if err != nil {
		return nil, err
	}
	err = server.LoadRelationshipCounts()
	if err != nil {
		return nil, err
	}
	server.TraceResults = make([]TraceResult, 0)
	server.TaskResults = make([]TaskResult, 0)
	server.LinkResults = make([]LinkResult, 0)
	server.routes()
	return &server, nil
}

func (server *Server) AddTraceResult(result TraceResult) {
	server.TraceResults = append(server.TraceResults, result)
}

func (server *Server) AddTaskResult(result TaskResult) {
	server.TaskResults = append(server.TaskResults, result)
}

func (server *Server) AddLinkResult(result LinkResult) {
	server.LinkResults = append(server.LinkResults, result)
}

func (s *Server) LoadTaskCounts() error {
	s.TotalTaskCounts = make(map[string]int)
	taskResults, err := s.DB.Query("SELECT operation, COUNT(*) FROM tasks GROUP BY operation")
	if err != nil {
		return err
	}
	for taskResults.Next() {
		var operation string
		var count int
		err = taskResults.Scan(&operation, &count)
		if err != nil {
			return err
		}
		s.TotalTaskCounts[operation] = count
	}
	return nil
}

func (s *Server) LoadRelationshipCounts() error {
	s.TotalRelationshipCounts = make(map[string]int)
	log.Println("Loading relationship counts")
	results, err := s.DB.Query("select src_operation, dst_operation, tag, COUNT(*) FROM span_links, tags WHERE span_links.trace_id=tags.trace_id GROUP BY src_operation, dst_operation, tag")
	if err != nil {
		return err
	}
	for results.Next() {
		var src_operation string
		var dst_operation string
		var tag string
		var count int
		err = results.Scan(&src_operation, &dst_operation, &tag, &count)
		if err != nil {
			return err
		}
		s.TotalRelationshipCounts[src_operation+"-"+dst_operation+"-"+tag] = count
	}
	s.TagCounts = make(map[string]int)
	log.Println("Loading tag counts")
	tag_results, err := s.DB.Query("SELECT tag, COUNT(*) FROM tags GROUP BY tag")
	if err != nil {
		return err
	}
	for tag_results.Next() {
		var tag string
		var count int
		err = tag_results.Scan(&tag, &count)
		if err != nil {
			return err
		}
		s.TagCounts[tag] = count
	}
	return nil
}

func (s *Server) InsertSpanTimes() error {
	log.Println("Inserting span times")
	initResults, err := s.DB.Query("SELECT COUNT(span_id) from span_times")
	if err != nil {
		return err
	}
	var count int
	for initResults.Next() {
		err = initResults.Scan(&count)
		if err != nil {
			return err
		}
	}
	if count != 0 {
		return nil
	}
	results, err := s.DB.Query("select span_id, startTime, duration from tasks")
	if err != nil {
		return err
	}
	valueStrings := make([]string, 0)
	valueArgs := make([]interface{}, 0)
	current_count := 0
	insertQuery := "INSERT IGNORE INTO span_times VALUES"
	for results.Next() {
		var span_id string
		var startTime time.Time
		var duration int64
		err = results.Scan(&span_id, &startTime, &duration)
		if err != nil {
			log.Println(err)
			continue
		}
		endTime := startTime.Add(time.Duration(duration))
		valueStrings = append(valueStrings, "(?, ?, ?)")
		valueArgs = append(valueArgs, span_id)
		valueArgs = append(valueArgs, startTime)
		valueArgs = append(valueArgs, endTime)
		current_count += 1
		if current_count%1000 == 0 {
			err = s.batchInsert(insertQuery, &valueStrings, &valueArgs)
			if err != nil {
				return err
			}
			valueStrings = make([]string, 0)
			valueArgs = make([]interface{}, 0)
		}
	}
	err = s.batchInsert(insertQuery, &valueStrings, &valueArgs)
	if err != nil {
		return err
	}
	return nil
}

func (s *Server) batchInsert(insertQuery string, valueStrings *[]string, valueArgs *[]interface{}) error {
	stmt := fmt.Sprintf(insertQuery+" %s", strings.Join(*valueStrings, ","))
	_, err := s.DB.Exec(stmt, *valueArgs...)
	return err
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
    if len(newTraces) == 0 {
        return nil
    }
    const createdFormat = "2006-01-02 15:04:05"
    tasks, err := parseTasksFile(s.Config.TasksFile)
    if err != nil {
	    return err
    }
    overview_query := "INSERT IGNORE INTO overview VALUES"
    tag_query := "INSERT IGNORE INTO tags VALUES"
    src_query := "INSERT IGNORE INTO sourcecode VALUES"
    dep_query := "INSERT IGNORE INTO dependencies VALUES"
    task_query := "INSERT IGNORE INTO tasks VALUES"
    event_query := "INSERT IGNORE INTO events VALUES"
    links_query := "INSERT IGNORE INTO span_links VALUES"

    overview_string := "(?, ?, ?, ?, ?)"
    tag_string := "(?, ?)"
    src_string := "(?, ?, ?, ?)"
    dep_string := "(?, ?, ?, ?)"
    task_string := "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    event_string := "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    links_string := "(?, ?, ?, ?, ?)"

    overview_strings := make([]string, 0)
    tag_strings := make([]string, 0)
    src_strings := make([]string, 0)
    dep_strings := make([]string, 0)
    task_strings := make([]string, 0)
    event_strings := make([]string, 0)
    links_strings := make([]string, 0)

    overview_args := make([]interface{}, 0)
    tag_args := make([]interface{}, 0)
    src_args := make([]interface{}, 0)
    dep_args := make([]interface{}, 0)
    task_args := make([]interface{}, 0)
    event_args := make([]interface{}, 0)
    links_args := make([]interface{}, 0)

    current_count := 0
    BATCH_ARGS_LIMIT := 50000 // Acutal mysql limit is 2^16 - 1 but lets be safe with 50K
    var traceLoadingTimes []time.Duration
    for _, trace := range newTraces {
        //log.Println("Processing", trace.ID)
        traceLoadingTime := time.Now()
        // Process all the relevant data
        stats := processTrace(trace)
        deps := processDependencies(trace)
        spans := processSpans(trace)
        traceLoadEndTime := time.Since(traceLoadingTime)
        traceLoadingTimes = append(traceLoadingTimes, traceLoadEndTime)
        //log.Println("Trace loading took", traceLoadEndTime.Seconds(), "s")
        current_count += 1

        // Collect overview info for db insert
        overview_strings = append(overview_strings, overview_string)
        overview_args = append(overview_args, trace.ID)
        overview_args = append(overview_args, stats.Duration)
        overview_args = append(overview_args, stats.DOC.Format(createdFormat))
        overview_args = append(overview_args, s.Traces[trace.ID])
        overview_args = append(overview_args, stats.NumEvents)

        // Collect tags info for db insert
        for _, tag := range stats.Tags {
            tag_strings = append(tag_strings, tag_string)
            tag_args = append(tag_args, trace.ID)
            tag_args = append(tag_args, tag)
        }

        // Collect source code info for db insert
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
            src_strings = append(src_strings, src_string)
            src_args = append(src_args, trace.ID)
            src_args = append(src_args, linenum)
            src_args = append(src_args, fname)
            src_args = append(src_args, val)
        }

        // Collect dependency info for db insert
        for dep, num := range deps {
            dep_strings = append(dep_strings, dep_string)
            dep_args = append(dep_args, trace.ID)
            dep_args = append(dep_args, dep.Source)
            dep_args = append(dep_args, dep.Destination)
            dep_args = append(dep_args, num)
        }

        opMap := make(map[string]string)
        for _, span := range spans {
            var linenum int
            var fname string
            if span.Source == " " || span.Source == "" {
                linenum = 0
                fname = ""
            } else {
                tokens := strings.Split(span.Source, ":")
                linenum, _ = strconv.Atoi(tokens[1])
                fname = tokens[0]
            }
            span.Operation = tasks[span.Source]
            opMap[span.SpanID] = span.Operation

            task_strings = append(task_strings, task_string)
            task_args = append(task_args, span.TraceID)
            task_args = append(task_args, span.SpanID)
            task_args = append(task_args, span.Duration)
            task_args = append(task_args, span.Operation)
            task_args = append(task_args, linenum)
            task_args = append(task_args, fname)
            task_args = append(task_args, span.ProcessName)
            task_args = append(task_args, span.ProcessID)
            task_args = append(task_args, span.ThreadID)
            task_args = append(task_args, span.StartTime)

            for _, event := range span.Events {
                var linenum int
                var fname string
                if event.Source == " " || event.Source == "" {
                    linenum = 0
                    fname = ""
                } else {
                    tokens := strings.Split(event.Source, ":")
                    linenum, _ = strconv.Atoi(tokens[1])
                    fname = tokens[0]
                }
                timestamp := time.Unix(0, event.Timestamp * 1000000)

                event_strings = append(event_strings, event_string)
                event_args = append(event_args, event.EventID)
                event_args = append(event_args, trace.ID)
                event_args = append(event_args, span.SpanID)
                event_args = append(event_args, span.Operation)
                event_args = append(event_args, linenum)
                event_args = append(event_args, fname)
                event_args = append(event_args, timestamp)
                event_args = append(event_args, event.Label)
                event_args = append(event_args, event.Host)
                event_args = append(event_args, event.Cycles)
            }
        }

        for _, span := range spans {
            links_strings = append(links_strings, links_string)
            links_args = append(links_args, trace.ID)
            links_args = append(links_args, span.ParentSpanID)
            links_args = append(links_args, opMap[span.ParentSpanID])
            links_args = append(links_args, span.SpanID)
            links_args = append(links_args, opMap[span.SpanID])
        }

        if current_count % 1000 == 0 {
            err = s.batchInsert(overview_query, &overview_strings, &overview_args)
            if err != nil {
                return err
            }
            err = s.batchInsert(tag_query, &tag_strings, &tag_args)
            if err != nil {
                return err
            }
            overview_strings = make([]string, 0)
            tag_strings = make([]string, 0)

            overview_args = make([]interface{}, 0)
            tag_args = make([]interface{}, 0)

            log.Println("Processed", current_count, "traces")
        }
        if len(src_args) > BATCH_ARGS_LIMIT {
            err = s.batchInsert(src_query, &src_strings, &src_args)
            if err != nil {
                return err
            }
            src_strings = make([]string, 0)
            src_args = make([]interface{}, 0)
        }
        if len(dep_args) > BATCH_ARGS_LIMIT {
            err = s.batchInsert(dep_query, &dep_strings, &dep_args)
            if err != nil {
                return err
            }
            dep_strings = make([]string, 0)
            dep_args = make([]interface{}, 0)
        }
        if len(task_args) > BATCH_ARGS_LIMIT {
            err = s.batchInsert(task_query, &task_strings, &task_args)
            if err != nil {
                return err
            }
            task_strings = make([]string, 0)
            task_args = make([]interface{}, 0)
        }
        if len(event_args) > BATCH_ARGS_LIMIT {
            err = s.batchInsert(event_query, &event_strings, &event_args)
            if err != nil {
                return err
            }
            event_strings = make([]string, 0)
            event_args = make([]interface{}, 0)
        }
        if len(links_args) > BATCH_ARGS_LIMIT {
            err = s.batchInsert(links_query, &links_strings, &links_args)
            if err != nil {
                return err
            }
            links_strings = make([]string, 0)
            links_args = make([]interface{}, 0)
        }
    }
    if len(overview_args) > 0 {
        err = s.batchInsert(overview_query, &overview_strings, &overview_args)
        if err != nil {
            return err
        }
    }
    if len(tag_args) > 0 {
        err = s.batchInsert(tag_query, &tag_strings, &tag_args)
        if err != nil {
            return err
        }
    }
    if len(src_args) > 0 {
        err = s.batchInsert(src_query, &src_strings, &src_args)
        if err != nil {
            return err
        }
    }
    if len(dep_args) > 0 {
        err = s.batchInsert(dep_query, &dep_strings, &dep_args)
        if err != nil {
            return err
        }
    }
    if len(task_args) > 0 {
        err = s.batchInsert(task_query, &task_strings, &task_args)
        if err != nil {
            return err
        }
    }
    if len(event_args) > 0 {
        err = s.batchInsert(event_query, &event_strings, &event_args)
        if err != nil {
            return err
        }
    }
    if len(links_args) > 0 {
        err = s.batchInsert(links_query, &links_strings, &links_args)
        if err != nil {
            return err
        }
    }
    log.Println("Finished processing traces")
    f, err := os.Create("trace_loading.txt")
    if err != nil {
        return err
    }
    defer f.Close()
    for _, loadingTime := range traceLoadingTimes {
        _, err := f.WriteString(fmt.Sprintf("%f\n",loadingTime.Seconds()))
        if err != nil {
            return err
        }
    }
    return nil
}

//Setup the various API endpoints for this server
func (s *Server) routes() {
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
	s.Router.HandleFunc("/tasks/{id}", s.Tasks)
	s.Router.HandleFunc("/tasklinks/{id}", s.TaskLinks)
	s.Router.HandleFunc("/savetraceids", s.SaveTraceIDs)
	s.Router.HandleFunc("/saveresults", s.SaveResults)
}

func setupResponse(w *http.ResponseWriter, r *http.Request) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

func (s *Server) SaveResults(w http.ResponseWriter, r *http.Request) {
	setupResponse(&w, r)
	log.Println(r)
	w.Header().Set("Content-Type", "application/json")
	f, err := os.Create("trace_results.csv")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		return
	}
	defer f.Close()
	_, err = f.WriteString("ID,Trace,Event\n")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write trace results"})
		return
	}
	for _, result := range s.TraceResults {
		_, err := f.WriteString(result.ID + "," + strconv.FormatFloat(result.Trace, 'f', -1, 64) + "," + strconv.FormatFloat(result.Event, 'f', -1, 64) + "\n")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write trace results"})
			return
		}
	}
	f2, err := os.Create("task_results.csv")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		return
	}
	_, err = f2.WriteString("ID,Task\n")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write task results"})
		return
	}
	for _, result := range s.TaskResults {
		_, err := f2.WriteString(result.ID + "," + strconv.FormatFloat(result.Task, 'f', -1, 64) + "\n")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write task results"})
			return
		}
	}
	f3, err := os.Create("link_results.csv")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		return
	}
	_, err = f3.WriteString("ID,Link\n")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write link results"})
		return
	}
	for _, result := range s.LinkResults {
		_, err := f3.WriteString(result.ID + "," + strconv.FormatFloat(result.Link, 'f', -1, 64) + "\n")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Cant write link results"})
			return
		}
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"response": "Done boss"})
}

func (s *Server) SaveTraceIDs(w http.ResponseWriter, r *http.Request) {
	setupResponse(&w, r)
	log.Println(r)
	w.Header().Set("Content-Type", "application/json")
	f, err := os.Create("trace_list.txt")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		return
	}
	defer f.Close()
	for id, _ := range s.Traces {
		f.WriteString("curl -s http://198.162.52.119:9000/traces/" + id + " > /dev/null \n")
		f.WriteString("curl -s http://198.162.52.119:9000/tasks/" + id + " > /dev/null \n")
		f.WriteString("curl -s http://198.162.52.119:9000/tasklinks/" + id + " > /dev/null \n")
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"response": "Done boss"})
}

//Returns the overview of the traces
func (s *Server) Overview(w http.ResponseWriter, r *http.Request) {
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
		var date time.Time
		err = rows.Scan(&responseRow.ID, &date, &responseRow.Duration, &responseRow.NumEvents)
		responseRow.Date = date.Format("2006-01-02 15:04:05")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			return
		}
		tagRows, err := s.DB.Query("SELECT tag FROM tags WHERE trace_id=?", responseRow.ID)
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

func (s *Server) CompareOneVsMany(w http.ResponseWriter, r *http.Request) {
	log.Println(r)
	setupResponse(&w, r)
	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(&ErrorResponse{Error: "Not Implemented"})
}

func (s *Server) CompareManyVsMany(w http.ResponseWriter, r *http.Request) {
	setupResponse(&w, r)
	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(&ErrorResponse{Error: "Not Implemented"})
}

func (s *Server) CompareOneVsOne(w http.ResponseWriter, r *http.Request) {
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
	reqStartTime := time.Now()
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
			return
		}
		defer f.Close()
		dec := json.NewDecoder(f)
		err = dec.Decode(&traces)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			return
		}
		reqLoadTraceTime := time.Since(reqStartTime)
		log.Println("Time to load just trace", reqLoadTraceTime.Seconds(), "seconds")
		w.WriteHeader(http.StatusOK)
		//sorted_events := xtrace.Sort_events(traces[0].Events)
		//sorted_events := traces[0].Events
		reqEventsStartTime := time.Now()
		eventCountRows, err := s.DB.Query("select events_aggregate.taskCount, events.operation, events.event_id FROM events_aggregate, events WHERE events.trace_id=? AND events_aggregate.operation=events.operation AND events_aggregate.fname=events.fname AND events_aggregate.linenum=events.linenum", traceID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			return
		}
		eventCountMap := make(map[string]int)
		eventOperationMap := make(map[string]string)
		for eventCountRows.Next() {
			var taskCount int
			var operation string
			var id string
			err = eventCountRows.Scan(&taskCount, &operation, &id)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
				return
			}
			eventCountMap[id] = taskCount
			eventOperationMap[id] = operation
		}
		var sorted_events []D3Event
		for _, event := range traces[0].Events {
			var d3event D3Event
			d3event.ProcessName = event.ProcessName
			d3event.Label = event.Label
			d3event.Timestamp = event.Timestamp
			d3event.HRT = event.HRT
			d3event.EventID = event.EventID
			d3event.Parents = event.Parents
			d3event.ThreadID = event.ThreadID
			d3event.Agent = event.Agent
			d3event.ProcessID = event.ProcessID
			d3event.Tags = event.Tags
			d3event.Source = event.Source
			d3event.Host = event.Host
			d3event.Cycles = event.Cycles
			var numerator int
			var denominator int
			var operation string
			if val, ok := eventCountMap[event.EventID]; ok {
				numerator = val
			}
			if val, ok := eventOperationMap[event.EventID]; ok {
				operation = val
				if val2, ok2 := s.TotalTaskCounts[operation]; ok2 {
					denominator = val2
				}
			}
			d3event.Probability = float64(numerator) / float64(denominator)
			sorted_events = append(sorted_events, d3event)
		}
		reqEventsTime := time.Since(reqEventsStartTime)
		log.Println("Time taken for events", reqEventsTime.Seconds(), "seconds")
		result := TraceResult{traceID, reqLoadTraceTime.Seconds(), reqEventsTime.Seconds()}
		s.AddTraceResult(result)
		log.Println(len(sorted_events))
		log.Println("Calculated Probability")
		json.NewEncoder(w).Encode(sorted_events)
		return
	}
}

func (s *Server) TaskLinks(w http.ResponseWriter, r *http.Request) {
	reqStartTime := time.Now()
	setupResponse(&w, r)
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	if len(params) != 1 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Request"})
		return
	}
	traceID := params["id"]
	if _, ok := s.Traces[traceID]; !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID"})
		return
	}
	tagRows, err := s.DB.Query("SELECT tag FROM tags WHERE trace_id=?", traceID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Println(err)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Failed to load tags from database"})
		return
	}
	var trace_type string
	for tagRows.Next() {
		var tag string
		err = tagRows.Scan(&tag)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Failed to load tags data from database"})
			return
		}
		if tag != "NginxWebServer" && tag != "NginxWebServer5" {
			trace_type = tag
		}
	}
	allLinkRows, err := s.DB.Query("SELECT src_span_id, dst_span_id, src_operation, dst_operation FROM span_links WHERE trace_id=?", traceID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Println(err)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Failed to load links data from database"})
		return
	}
	var links []LinkRow
	for allLinkRows.Next() {
		var src_span_id string
		var dst_span_id string
		var src_operation string
		var dst_operation string
		err = allLinkRows.Scan(&src_span_id, &dst_span_id, &src_operation, &dst_operation)
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Failed to load links data from database"})
			return
		}
		var percentage float64
		if v, ok := s.TotalRelationshipCounts[src_operation+"-"+dst_operation+"-"+trace_type]; ok {
			if tagCount, ok2 := s.TagCounts[trace_type]; ok2 {
				percentage = float64(v) / float64(tagCount)
			} else {
				percentage = 0.0
			}
		}
		row := LinkRow{src_span_id, dst_span_id, src_operation, dst_operation, percentage}
		links = append(links, row)
	}
	reqEndTime := time.Since(reqStartTime)
    log.Println("Time taken for edges", reqEndTime.Seconds(), "seconds")
	result := LinkResult{traceID, reqEndTime.Seconds()}
	s.AddLinkResult(result)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(links)
}

func (s *Server) Tasks(w http.ResponseWriter, r *http.Request) {
	reqStartTime := time.Now()
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
	if _, ok := s.Traces[traceID]; !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Invalid Trace ID"})
		return
	}
	allProcStartTime := time.Now()
	allDurationData := make(map[string][]uint64)
	allDurationRows, err := s.DB.Query("SELECT tasks.duration, tasks.operation FROM tasks WHERE operation IN (SELECT tasks.operation FROM tasks WHERE tasks.trace_id=?)", traceID)
	allProcEndTime := time.Since(allProcStartTime)
	log.Println("All durations processing took", allProcEndTime.Seconds(), "s")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		log.Println("FAILED TO LOAD LIST OF DURATIONS", err)
		return
	}
	for allDurationRows.Next() {
		var duration uint64
		var operation string
		err = allDurationRows.Scan(&duration, &operation)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			return
		}
		if v, ok := allDurationData[operation]; !ok {
			var data []uint64
			data = append(data, duration)
			allDurationData[operation] = data
		} else {
			v = append(v, duration)
			allDurationData[operation] = v
		}
	}
	timeRowStart := time.Now()
	timingRow, err := s.DB.Query("SELECT minStart, maxEnd FROM trace_times WHERE trace_id=?", traceID)
	timeRowEnd := time.Since(timeRowStart)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		log.Println("FAILED TO LOAD trace time", err)
		return
	}
	var startTime time.Time
	var endTime time.Time
	for timingRow.Next() {
		err = timingRow.Scan(&startTime, &endTime)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			log.Println("FAILED TO LOAD trace time", err)
			return
		}
	}
	log.Println("Timing Row took", timeRowEnd.Seconds(), "s")
	allConcurrentQueryStart := time.Now()
	allConcurrentSpans, err := s.DB.Query("SELECT start, end, processName, processID, operation FROM molehillData WHERE ((start >=? AND start <=?) or (end >= ? AND end <= ?)) AND molehillData.operation IN (select operation FROM tasks WHERE trace_id=?)", startTime, endTime, startTime, endTime, traceID)
	allConcurrentQueryEnd := time.Since(allConcurrentQueryStart)
	log.Println("AllconcurrentSpans took", allConcurrentQueryEnd.Seconds(), "s")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		log.Println("FAILED TO LOAD MOLEHILLS", err)
		return
	}
	var molehillTasks []MoleHillTask
	for allConcurrentSpans.Next() {
		var molehillTask MoleHillTask
		err = allConcurrentSpans.Scan(&molehillTask.Start, &molehillTask.End, &molehillTask.ProcName, &molehillTask.ProcID, &molehillTask.Operation)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			log.Println("FAILED TO LOAD MOLEHILLS", err)
			return
		}
		molehillTasks = append(molehillTasks, molehillTask)
	}
	lotasks, err := s.DB.Query("SELECT tasks.ProcessName, tasks.ProcessID, tasks.ThreadID, tasks.duration, tasks.operation, tasks.span_id FROM tasks WHERE trace_id=\"" + traceID + "\"")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		log.Println("FAILED TO LOAD LIST OF TASKS", err)
		return
	}
	var taskRows []TaskRow
	for lotasks.Next() {
		var task TaskRow
		var spanID string
		err = lotasks.Scan(&task.ProcessName, &task.ProcessID, &task.ThreadID, &task.Duration, &task.Operation, &spanID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
			return
		}
		task.Data = allDurationData[task.Operation]
		///*
		if err != nil {
			log.Println(err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
		}
		var moleHilldata []ConcurrentTask
		//moleHilldata := make([]uint64, task.Duration)
		for _, mtask := range molehillTasks {
			if mtask.Operation != task.Operation || mtask.ProcName != task.ProcessName || mtask.ProcID != task.ProcessID {
				continue
			}
			var constartTime time.Time
			var conendTime time.Time
			constartTime = mtask.Start
			conendTime = mtask.End
			start := int64(0)
			end := int64(task.Duration)
			if constartTime.After(startTime) {
				dur := constartTime.Sub(startTime)
				start = int64(dur.Nanoseconds() / 1000000)
			}
			if conendTime.Before(endTime) {
				dur := endTime.Sub(conendTime)
				end = end - int64(dur.Nanoseconds()/1000000)
			}
			var concTask ConcurrentTask
			concTask.Start = start
			concTask.End = end
			moleHilldata = append(moleHilldata, concTask)
		}
		task.MolehillData = moleHilldata
		//*/
		taskRows = append(taskRows, task)
	}
	reqMoleHilltime := time.Since(reqStartTime)
	log.Println("Getting tasks took", reqMoleHilltime.Seconds(), "seconds")
	result := TaskResult{traceID, reqMoleHilltime.Seconds()}
	s.AddTaskResult(result)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(taskRows)
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

func (s *Server) Dependency(w http.ResponseWriter, r *http.Request) {
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
	for dep, v := range depMap {
		if _, ok := ids[dep.Source]; !ok {
			node := D3Node{ID: dep.Source, Group: 1}
			ids[dep.Source] = curr_id
			curr_id += 1
			depCount[dep.Source] = 1
			nodes = append(nodes, node)
		} else {
			depCount[dep.Source] += 1
		}
		if _, ok := ids[dep.Destination]; !ok {
			node := D3Node{ID: dep.Destination, Group: 1}
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

func (s *Server) Aggregate(w http.ResponseWriter, r *http.Request) {
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

func (s *Server) FilterTraces(w http.ResponseWriter, r *http.Request) {
	setupResponse(&w, r)
	w.Header().Set("Content-Type", "application/json")
	log.Println(r)
	q := r.URL.Query()

	log.Println(q)
	if len(q) == 0 {

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
			log.Println(responseRow.Date)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(&ErrorResponse{Error: "Internal Server Error"})
				return
			}
			tagRows, err := s.DB.Query("SELECT tag FROM tags WHERE trace_id=?", responseRow.ID)
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

func (s *Server) Tags(w http.ResponseWriter, r *http.Request) {
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
