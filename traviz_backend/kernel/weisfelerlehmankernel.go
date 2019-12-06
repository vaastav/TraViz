package kernel

import (
	"sort"
	"strings"
	"strconv"
)

type Result struct {
	Labels map[string][]string
	Scores map[string]float64
}

type MultiSetLabelGenerator struct {
	Seed int
	Labels map[string]string
}

func NewMSLGenerator() MultiSetLabelGenerator {
	return MultiSetLabelGenerator{Seed: 0, Labels: make(map[string]string)}
}

func (g * MultiSetLabelGenerator) Next() int {
	g.Seed += 1
	return g.Seed
}

func (g * MultiSetLabelGenerator) Relabel(label string, neighbour_labels []string) string {
	sort.Strings(neighbour_labels)

	canonical_label := label + ":" + strings.Join(neighbour_labels[:], ", ")

	if _, ok := g.Labels[canonical_label]; !ok {
		g.Labels[canonical_label] = strconv.Itoa(g.Next())
	}

	return g.Labels[canonical_label]
}

type WeisfeilerLehmanKernel struct {
	BaseKernel
	kernel NodeCountKernel
	generator MultiSetLabelGenerator
	depth int
}

func NewWLKernel(depth int) WeisfeilerLehmanKernel {
    return WeisfeilerLehmanKernel{kernel: NodeCountKernel{}, generator: NewMSLGenerator(), depth: depth}
}

func (k * WeisfeilerLehmanKernel) Relabel(G Graph, direction string) Graph {
	println("Inside Relabel")
	next := G.CopyGraph()

	nodes := G.GetNodes()
	println("Getting labels")
	for _, node := range nodes {
		var neighbour_labels []string
		if direction=="both" {
			neighbour_labels = G.GetNeighbourLabels(node)
		} else if direction == "up" {
			neighbour_labels = G.GetParentLabels(node)
		} else {
			neighbour_labels = G.GetChildLabels(node)
		}
		next.Relabel(node.ID, k.generator.Relabel(node.Label, neighbour_labels))
	}

	println("Deleting nodes")
	for _, node := range nodes {
		if direction == "both" {
			continue
		}

		var neighbours []string
		if direction == "up" {
			neighbours = G.GetParentIDs(node.ID)
		} else {
			neighbours = G.GetChildIDs(node.ID)
		}

		if len(neighbours) == 0 {
			next.Remove(node)
		}
	}

	return *next
}

func (k * WeisfeilerLehmanKernel) Calculate(A Graph, B Graph) float64 {
	return k.calculateImpl(A, B, "both")
}

func (k * WeisfeilerLehmanKernel) CalculateForwards(A Graph, B Graph) float64 {
	return k.calculateImpl(A, B, "down")
}

func (k * WeisfeilerLehmanKernel) CalculateBackwards(A Graph, B Graph) float64 {
	return k.calculateImpl(A, B, "up")
}

func (k * WeisfeilerLehmanKernel) calculateImpl(A Graph, B Graph, direction string) float64 {
	score := k.kernel.Calculate(A, B)
	for i := 1; i < k.depth; i++ {
		A = k.Relabel(A, direction)
		B = k.Relabel(B, direction)
		score += k.kernel.Calculate(A, B)
	}
	return float64(score) / float64(k.depth)
}

func (k * WeisfeilerLehmanKernel) CalculateNodeStability(A Graph, B Graph, direction string) []Result {
	A_labels := make(map[string][]string)
	B_labels := make(map[string][]string)
	A_scores := make(map[string]float64)
	B_scores := make(map[string]float64)

	for _, nodeID := range A.GetNodeIDs() {
		A_labels[nodeID] = []string{}
		A_scores[nodeID] = 0.0
	}
	for _, nodeID := range B.GetNodeIDs() {
		B_labels[nodeID] = []string{}
		B_scores[nodeID] = 0.0
	}

	for i := 0; i < k.depth; i++ {
		for _, label := range A.GetLabels() {
			score := float64(B.GetLabelCount(label)) / float64(A.GetLabelCount(label))
			if score > 1 {
				score = 1 / score
			}
			for _, nodeID := range A.GetNodeIDsForLabel(label) {
				A_labels[nodeID] = append(A_labels[nodeID], label)
				if score > 0 {
					A_scores[nodeID] = 0.5 + 0.5 * score
				}
			}
		}

		for _, label := range B.GetLabels() {
			score := float64(A.GetLabelCount(label)) / float64(B.GetLabelCount(label))
			if score > 1 {
				score = 1 / score
			}
			for _, nodeID := range B.GetNodeIDsForLabel(label) {
				B_labels[nodeID] = append(B_labels[nodeID], label)
				if score > 0 {
					B_scores[nodeID] = 0.5 + 0.5 * score
				}
			}
		}

		A = k.Relabel(A, direction)
		B = k.Relabel(B, direction)
	}

	A_result := Result{Labels: A_labels, Scores: A_scores}
	B_result := Result{Labels: B_labels, Scores: B_scores}
	results := []Result{A_result, B_result}
	return results
}
