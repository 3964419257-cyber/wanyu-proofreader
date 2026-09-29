package main

import (
	"path/filepath"
	"testing"

	"fangji/backend/reviewbundle"
)

func TestValidationDoesNotChangeRecordCounts(t *testing.T) {
	app := newSchemaTestApp(t)
	names := []string{"projects", "pages", "import_jobs", "users"}
	before := map[string]int64{}
	for _, name := range names {
		count, err := app.CountRecords(name)
		if err != nil {
			t.Fatal(err)
		}
		before[name] = count
	}
	dir := filepath.Join("..", "docs", "fixtures", "review-bundle-v0", "inbound")
	for i := 0; i < 2; i++ {
		report, err := reviewbundle.ValidateDir(dir)
		if err != nil {
			t.Fatal(err)
		}
		if !report.OK {
			t.Fatalf("%#v", report)
		}
	}
	for _, name := range names {
		count, err := app.CountRecords(name)
		if err != nil {
			t.Fatal(err)
		}
		if count != before[name] {
			t.Fatalf("%s changed from %d to %d", name, before[name], count)
		}
	}
}
