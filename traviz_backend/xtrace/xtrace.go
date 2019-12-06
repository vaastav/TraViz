package xtrace

import (
    "crypto/sha1"
    "encoding/base64"
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

func (e * Event) GetHashString() string {
    hasher := sha1.New()
    hasher.Write([]byte(e.Source))
    sha := base64.URLEncoding.EncodeToString(hasher.Sum(nil))
    return sha
}

//Struct that represents an XTrace. This corresponds to XTraceV4
type XTrace struct {
    ID string `json:"id"`
    Events []Event `json:"reports"`
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

func Sort_events(events []Event) []Event {
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
