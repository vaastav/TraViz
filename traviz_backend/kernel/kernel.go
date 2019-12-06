package kernel

type BaseKernel struct {
	Attributes map[string]interface{}
}

func (k * BaseKernel) GetAttributeNames() []string {
	var keys []string
	for key := range k.Attributes {
		keys = append(keys, key)
	}
	return keys
}

func (k * BaseKernel) SetAttribute(key string, value interface{}) {
	k.Attributes[key] = value
}

func (k * BaseKernel) GetAttribute(key string) interface{} {
	return k.Attributes[key]
}

func (k * BaseKernel) Calculate(A Graph, B Graph) float64 {
	return 0.0
}

func (k * BaseKernel) CalculateAll(graphs []Graph) map[string]float64 {
	scores := make(map[string]float64)
	for i := 0; i < len(graphs); i++ {
		for j:=0; j < i; j++ {
			score := k.Calculate(graphs[i], graphs[j])
			scores[graphs[i].ID + "-" + graphs[j].ID] = score
			scores[graphs[j].ID + "-" + graphs[i].ID] = score
		}
	}
	return scores
}
