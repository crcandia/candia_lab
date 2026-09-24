"""Regression checks against the calendar used by the Jian Gao seminar.

Run from a checkout with: python -m unittest discover -s tests -p 'test_event_calendar.py'
"""
from datetime import datetime, timedelta
from html.parser import HTMLParser
from pathlib import Path
import os
import unittest

ROOT = Path(os.environ.get('CRISSLAB_REPO_ROOT', Path(__file__).resolve().parents[1]))
EVENT = 'metadatos-cientificos-miguel-guevara'
ZOOM = 'https://us02web.zoom.us/j/83151046254?pwd=hInKEadzXqvt5XS93bYoKiHEiLEbDj.1'
CDN = 'https://cdn.jsdelivr.net/npm/add-to-calendar-button@2'


class CalendarMarkup(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.buttons = []
        self.scripts = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == 'add-to-calendar-button':
            self.buttons.append(attributes)
        if tag == 'script' and 'add-to-calendar-button' in attributes.get('src', ''):
            self.scripts.append(attributes)


class SeminarCalendarTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = CalendarMarkup(
            (ROOT / 'content/en/event/talk23_JianGao/index.md').read_text(encoding='utf-8')
        )

    def documents(self):
        for language in ('en', 'es'):
            path = ROOT / f'content/{language}/event/{EVENT}/index.md'
            text = path.read_text(encoding='utf-8')
            yield language, text, CalendarMarkup(text)

    def test_same_library_and_single_component(self):
        self.assertEqual(len(self.reference.buttons), 1)
        self.assertEqual(len(self.reference.scripts), 1)
        for language, _, markup in self.documents():
            with self.subTest(language=language):
                self.assertEqual(len(markup.buttons), 1)
                self.assertEqual(markup.scripts, self.reference.scripts)
                self.assertEqual(markup.scripts[0]['src'], CDN)

    def test_same_native_options_and_attribute_set(self):
        reference = self.reference.buttons[0]
        changing = {'name', 'description', 'startdate', 'enddate', 'starttime', 'endtime'}
        for language, _, markup in self.documents():
            with self.subTest(language=language):
                actual = markup.buttons[0]
                self.assertEqual(set(actual), set(reference))
                for attribute in set(reference) - changing:
                    self.assertEqual(actual[attribute], reference[attribute], attribute)

    def test_event_details(self):
        for language, _, markup in self.documents():
            with self.subTest(language=language):
                button = markup.buttons[0]
                self.assertEqual(button['startdate'], '2026-09-30')
                self.assertEqual(button['enddate'], '2026-09-30')
                self.assertEqual(button['starttime'], '15:00')
                self.assertEqual(button['endtime'], '16:00')
                self.assertEqual(button['timezone'], 'America/Santiago')
                for detail in (ZOOM, '831 5104 6254', '198619', 'Miguel Guevara'):
                    self.assertIn(detail, button['description'])
                self.assertIn('provisional', button['description'].lower())
                start = datetime.fromisoformat(button['startdate']+'T'+button['starttime'])
                end = datetime.fromisoformat(button['enddate']+'T'+button['endtime'])
                self.assertEqual(end-start, timedelta(hours=1))

    def test_calendar_precedes_content_and_no_separate_ics_button(self):
        for language, text, _ in self.documents():
            with self.subTest(language=language):
                self.assertLess(text.index('<add-to-calendar-button'), text.index('\n## '))
                self.assertNotIn('icsFile=', text)
                self.assertNotIn('event.ics', text)
                self.assertNotIn('class="event-calendar"', text)
                self.assertNotIn('icon: calendar-alt', text)


if __name__ == '__main__':
    unittest.main()
