package kernel

import (
	"github.com/vaastav/TraViz/traviz_backend/xtrace"
)

type Node struct {
	ID string
	Label string
	Event xtrace.Event
}


func NewNode(event xtrace.Event) Node {
    label := "L-" + event.GetHashString()
    return Node{ID: event.EventID, Label: label, Event: event}
}

type Graph struct {
	ID string
	Nodes map[string]Node
	Parents map[string][]string // Parents of each node
	Children map[string][]string // Children of each node
	Labels map[string][]string // All nodes with a particular label
}

func GraphFromXTrace(trace xtrace.XTrace) *Graph {
    var nodes []Node
    for _, event := range trace.Events {
        node := NewNode(event)
        nodes = append(nodes, node)
    }
    graph := NewGraph(trace.ID, nodes)
    for _, event := range trace.Events {
        for _, parent := range event.Parents {
            graph.Link(parent, event.EventID)
        }
    }
    return graph
}

func NewGraph(ID string, nodes []Node) *Graph {
	internal_nodes := make(map[string]Node)
	parents := make(map[string][]string)
	children := make(map[string][]string)
	labels := make(map[string][]string)

	for _, node := range nodes {
		internal_nodes[node.ID] = node
	}

	return &Graph{ID: ID, Nodes: internal_nodes, Parents: parents, Children: children, Labels: labels}
}

func (g * Graph) CopyGraph() *Graph {
	newGraph := NewGraph(g.ID, g.GetNodes())
	for id :=  range g.Parents {
		for _, pid := range g.Parents[id] {
			newGraph.Link(pid, id)
		}
	}
	return newGraph
}

func (g * Graph) Remove(node Node) {
	if _, ok := g.Nodes[node.ID]; !ok {
		return
	}

	parents := g.Parents[node.ID]
	children := g.Children[node.ID]

	for _, parent := range parents {
		var updatedChildren []string
		for _, child := range g.Children[parent] {
			if child != node.ID {
				updatedChildren = append(updatedChildren, child)
			}
		}
		g.Children[parent] = updatedChildren
		for _, child := range children {
			if _, ok := g.Children[parent]; !ok {
				g.Children[parent] = []string{child}
			} else {
				g.Children[parent] = append(g.Children[parent], child)
			}
		}
	}

	for _, child := range children {
		var updatedParents []string
		for _, parent := range g.Parents[child] {
			if parent != node.ID {
				updatedParents = append(updatedParents, parent)
			}
		}
		g.Parents[child] = updatedParents
		for _, parent := range parents {
			if _, ok := g.Parents[child]; !ok {
				g.Parents[child] = []string{parent}
			} else {
				g.Parents[child] = append(g.Parents[child], parent)
			}
		}
	}

	delete(g.Nodes, node.ID)
	delete(g.Parents, node.ID)
	delete(g.Children, node.ID)

	// Delete/Update the old label
	var updatedNodes []string
	for _, id := range g.Labels[node.Label] {
		if id != node.ID {
			updatedNodes = append(updatedNodes, id)
		}
	}
	if len(updatedNodes) == 0 {
		delete(g.Labels, node.Label)
	} else {
		g.Labels[node.Label] = updatedNodes
	}
}

func (g * Graph) Link(parentID string, nodeID string) {
	if v, ok := g.Parents[nodeID]; !ok {
		g.Parents[nodeID] = []string{parentID}
	} else {
		v = append(v, parentID)
		g.Parents[nodeID] = v
	}

	if v, ok := g.Children[parentID]; !ok {
		g.Children[parentID] = []string{nodeID}
	} else {
		v = append(v, nodeID)
		g.Children[parentID] = v
	}
}

func (g * Graph) GetNodeIDs() []string {
	var nodeIDs []string
	for nodeID := range g.Nodes {
		nodeIDs = append(nodeIDs, nodeID)
	}
	return nodeIDs
}

func (g * Graph) GetNodes() []Node {
	var nodes []Node
	for _, node := range g.Nodes {
		nodes = append(nodes, node)
	}
	return nodes
}

func (g * Graph) GetNumNodes() int {
	return len(g.Nodes)
}

func (g * Graph) GetParentIDs(nodeID string) []string {
	if _, ok := g.Parents[nodeID]; ok {
		return g.Parents[nodeID]
	}
	return []string{}
}

func (g * Graph) GetParents(nodeID string) []Node {
	if _, ok := g.Parents[nodeID]; ok {
		var parents []Node
		for _, parentID := range g.Parents[nodeID] {
			parents = append(parents, g.Nodes[parentID])
		}
		return parents
	}
	return []Node{}
}

func (g * Graph) GetParentLabels(node Node) []string {
	var labels []string
	if _, ok := g.Parents[node.ID]; ok {
		for _, parentID := range g.Parents[node.ID] {
			labels = append(labels, g.Nodes[parentID].Label)
		}
	}
	return labels
}

func (g * Graph) GetChildIDs(nodeID string) []string {
	if _, ok := g.Children[nodeID]; ok {
		return g.Children[nodeID]
	}
	return []string{}
}

func (g * Graph) GetChildren(node Node) []Node {
	var children []Node
	if _, ok := g.Children[node.ID]; ok {
		for _, childID := range g.Children[node.ID] {
			children = append(children, g.Nodes[childID])
		}
	}
	return children
}

func (g * Graph) GetChildLabels(node Node) []string {
	var labels []string
	if _, ok := g.Children[node.ID]; ok {
		for _, childID := range g.Children[node.ID] {
			labels = append(labels, g.Nodes[childID].Label)
		}
	}
	return labels
}

func (g * Graph) GetNeighbourIDs(nodeID string) []string {
	var neighbourIDs []string

	if _, ok := g.Parents[nodeID]; ok {
		neighbourIDs = append(neighbourIDs, g.Parents[nodeID]...)
	}

	if _, ok := g.Children[nodeID]; ok {
		neighbourIDs = append(neighbourIDs, g.Children[nodeID]...)
	}

	return neighbourIDs
}

func (g * Graph) GetNeighbours(node Node) []Node {
	var neighbours []Node

	if _, ok := g.Parents[node.ID]; ok {
		for _, parentID := range g.Parents[node.ID] {
			neighbours = append(neighbours, g.Nodes[parentID])
		}
	}

	if _, ok := g.Children[node.ID]; ok {
		for _, childID := range g.Children[node.ID] {
			neighbours = append(neighbours, g.Nodes[childID])
		}
	}

	return neighbours
}

func (g * Graph) GetNeighbourLabels(node Node) []string {
	var labels []string

	if _, ok := g.Parents[node.ID]; ok {
		for _, parentID := range g.Parents[node.ID] {
			labels = append(labels, g.Nodes[parentID].Label)
		}
	}

	if _, ok := g.Children[node.ID]; ok {
		for _, childID := range g.Children[node.ID] {
			labels = append(labels, g.Nodes[childID].Label)
		}
	}

	return labels
}

func (g * Graph) GetLabels() []string {
	var labels []string
	for label := range g.Labels {
		labels = append(labels, label)
	}
	return labels
}

func (g * Graph) GetNodeIDsForLabel(label string) []string {
	if v, ok := g.Labels[label]; ok {
		return v
	}
	return []string{}
}

func (g * Graph) GetNumLabels() int {
	return len(g.Labels)
}

func (g * Graph) GetLabelCount(label string) int {
	if v, ok := g.Labels[label]; ok {
		return len(v)
	}
	return 0
}

func (g * Graph) Relabel(nodeID string, label string) {
	if node, ok := g.Nodes[nodeID]; ok {
		// Updated the node
		oldLabel := node.Label
		node.Label = label
		g.Nodes[nodeID] = node

		// Add/Update the new label
		if v, ok2 := g.Labels[label]; !ok2 {
			g.Labels[label] = []string{nodeID}
		} else {
			g.Labels[label] = append(v, nodeID)
		}

		// Delete/Update the old label
		var updatedNodes []string
		for _, id := range g.Labels[oldLabel] {
			if id != nodeID {
				updatedNodes = append(updatedNodes, id)
			}
		}
		if len(updatedNodes) == 0 {
			delete(g.Labels, oldLabel)
		} else {
			g.Labels[oldLabel] = updatedNodes
		}
	}
}
