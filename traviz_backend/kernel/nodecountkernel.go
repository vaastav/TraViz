package kernel

func dotProduct(arr1 []int, arr2 []int) int {
	score := 0
	for i := 0; i < len(arr1); i++ {
		score += arr1[i] * arr2[i]
	}
	return score
}

type NodeCountKernel struct {
	BaseKernel
}

func (k * NodeCountKernel) Calculate(A Graph, B Graph) float64 {
	a_labels := A.GetLabels()
	b_labels := B.GetLabels()

	var all_labels []string
	for _, a_label := range a_labels {
		all_labels = append(all_labels, a_label)
	}
	for _, b_label := range b_labels {
		all_labels = append(all_labels, b_label)
	}

	var a_features []int
	var b_features []int
	for _, label := range all_labels {
		a_features = append(a_features, A.GetLabelCount(label))
		b_features = append(b_features, B.GetLabelCount(label))
	}
	total := A.GetNumNodes() * B.GetNumNodes()
	return float64(dotProduct(a_features, b_features)) / float64(total)
}
