package tests

// Run with: go test -v tests/news_dates_test.go
// Exercises the real metadata template with small Hugo-compatible stubs.
// It does not replace a complete Hugo production build.
import (
 "bytes"
 "fmt"
 "html/template"
 "os"
 "path/filepath"
 "reflect"
 "runtime"
 "strings"
 "testing"
 "time"
)

type dateFormatter struct{}
func (dateFormatter) Format(layout string, value time.Time) string { return value.Format(layout) }
type metadataPage struct {
 Type string
 Date, Lastmod, PublishDate time.Time
 Params map[string]interface{}
 ReadingTime int
 RelPermalink string
}
func (p metadataPage) Param(name string) interface{} { return p.Params[name] }
func (p metadataPage) GetTerms(name string) []interface{} { return nil }

func TestNewsPublicationDates(t *testing.T) {
 _, here, _, _ := runtime.Caller(0)
 text, err := os.ReadFile(filepath.Join(filepath.Dir(here), "..", "layouts", "partials", "page_metadata.html"))
 if err != nil { t.Fatal(err) }
 original := time.Date(2024, 9, 11, 0, 0, 0, 0, time.UTC)
 updated := time.Date(2026, 9, 24, 0, 0, 0, 0, time.UTC)
 for _, lang := range []string{"en", "es"} {
  for _, view := range []int{0, 1} {
   for _, kind := range []string{"post", "publication", "project", "event"} {
    name := fmt.Sprintf("%s/view%d/%s", lang, view, kind)
    t.Run(name, func(t *testing.T) {
     page := metadataPage{Type:kind, Date:original, Lastmod:updated, PublishDate:updated,
      Params:map[string]interface{}{"Date":original, "Lastmod":updated}, ReadingTime:1}
     site := map[string]interface{}{"Params":map[string]interface{}{
      "locale":map[string]interface{}{"date_format":"2006-01-02"},
      "publications":map[string]interface{}{"date_format":"January, 2006"},
      "features":map[string]interface{}{"comment":map[string]interface{}{
       "provider":"", "disqus":map[string]interface{}{"show_count":false}}},
     }}
     functions := template.FuncMap{
      "time":func() dateFormatter { return dateFormatter{} },
      "site":func() interface{} { return site },
      "slice":func(values ...interface{}) []interface{} { return values },
      "in":func(values []interface{}, value interface{}) bool {
       for _, x := range values { if reflect.DeepEqual(x,value) { return true } };return false
      },
      "default":func(fallback, value interface{}) interface{} {
       if value==nil || reflect.ValueOf(value).IsZero() { return fallback };return value
      },
      "partial":func(name string, context interface{}) string { return "" },
      "i18n":func(key string) string {
       if key=="last_updated" { if lang=="es" {return "Última actualización el"};return "Last updated on" }
       return key
      },
      "markdownify":func(s string) string {return s},
      "lower":strings.ToLower, "trim":strings.Trim,
     }
     tpl, e := template.New("metadata").Funcs(functions).Parse(string(text)); if e!=nil {t.Fatal(e)}
     var b bytes.Buffer
     e=tpl.Execute(&b,map[string]interface{}{"is_list":view,"page":page});if e!=nil {t.Fatal(e)}
     rendered:=b.String()
     switch kind {
     case "post":
      if !strings.Contains(rendered,"2024-09-11") || strings.Contains(rendered,"2026-09-24") || strings.Contains(rendered,"Last updated") || strings.Contains(rendered,"Última actualización") {t.Fatalf("News must show original date, not import/update date: %s",rendered)}
     case "publication":
      if !strings.Contains(rendered,"September, 2024") || strings.Contains(rendered,"2026-09-24") {t.Fatalf("Publication date changed: %s",rendered)}
     case "project":
      if !strings.Contains(rendered,"2026-09-24") {t.Fatalf("Non-news modification date lost: %s",rendered)}
     case "event":
      if strings.Contains(rendered,"article-date") {t.Fatalf("Event date must remain with event-specific renderer: %s",rendered)}
     }
    })
   }
  }
 }
}
