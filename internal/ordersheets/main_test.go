package ordersheets

import (
	"reflect"
	"testing"
)

func TestReadFile(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		content  []byte
		want     [][]string
	}{
		{
			name:     "CSV file",
			filename: "test.csv",
			content:  []byte("col1,col2\nval1,val2"),
			want: [][]string{
				{"col1", "col2"},
				{"val1", "val2"},
			},
		},
		{
			name:     "TSV file",
			filename: "test.tsv",
			content:  []byte("col1\tcol2\nval1\tval2"),
			want: [][]string{
				{"col1", "col2"},
				{"val1", "val2"},
			},
		},
		{
			name:     "Case insensitive extension",
			filename: "test.TSV",
			content:  []byte("col1\tcol2\nval1\tval2"),
			want: [][]string{
				{"col1", "col2"},
				{"val1", "val2"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ReadFile(tt.content, tt.filename)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ReadFile() = %v, want %v", got, tt.want)
			}
		})
	}
}
