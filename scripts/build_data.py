#!/usr/bin/env python3
"""Normalize the PEN student workbook into private/data.json.

The combined sheet named "PSRP-I Student Data" already contains every PEIMA,
PSRP-I, and PSRP-II row. The standalone PEIMA and PSRP-II sheets are excluded
so students are not counted twice.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT.parent / "Student Data PEIMA, PSRP-I,II, ESP, adopted Punjab, Sindhxlsx.xlsx"
OUT = ROOT / "private" / "data.json"
REFERENCE = date(2026, 10, 14)

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}

ROMAN = {
    "i": 1,
    "ii": 2,
    "iii": 3,
    "iv": 4,
    "v": 5,
    "vi": 6,
    "vii": 7,
    "viii": 8,
    "ix": 9,
    "x": 10,
}
WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

RELIGION = {
    "islam": "Islam",
    "lslam": "Islam",
    "isalm": "Islam",
    "muslim": "Islam",
    "christian": "Christian",
    "christianity": "Christian",
    "hindu": "Hindu",
    "hindusim": "Hindu",
    "hinduism": "Hindu",
}

PLACE_ALIASES = {
    "pak pattan": "Pakpattan",
    "tmk": "Tando Muhammad Khan",
    "tmk ii": "Tando Muhammad Khan",
    "dariya khan": "Darya Khan",
    "darya khan": "Darya Khan",
    "mankara": "Mankera",
    "mankera": "Mankera",
    "esakhel": "Isa Khel",
    "isa khel": "Isa Khel",
    "shuja abad": "Shujabad",
    "bulri shah karim": "Bulri Shah Karim",
}

SHEETS = [
    {
        "name": "PSRP-I Student Data",
        "include": True,
        "source": "Punjab partner schools",
        "note": "Combined extract. Programs inside it are PEIMA, PSRP-I, and PSRP-II.",
    },
    {
        "name": "PEIMA Student Data",
        "include": False,
        "source": "PEIMA sheet",
        "note": "Excluded. All 12,470 rows already sit in the combined Punjab sheet under program PEIMA.",
    },
    {
        "name": " PSRP-II Student Data",
        "include": False,
        "source": "PSRP-II sheet",
        "note": "Excluded. All 5,403 rows already sit in the combined Punjab sheet. Its second date column repeats admission date within a few days and is not a date of birth.",
    },
    {
        "name": "Sindh Students Data",
        "include": True,
        "source": "Sindh PSP",
        "note": "Sindh Education Foundation PSP schools. District code TMK is Tando Muhammad Khan.",
    },
    {
        "name": "ESP Students Data ",
        "include": True,
        "source": "Evening School Program",
        "note": "PEN evening schools. Trailing blank rows in the sheet are ignored.",
    },
    {
        "name": "Punjab Students Data ",
        "include": True,
        "source": "Punjab adopted schools",
        "note": "PEN-adopted government schools. The sheet has no Program column; project PEN Adoption is used.",
    },
]


def norm_header(value):
    if value is None:
        return None
    return " ".join(str(value).replace("\n", " ").split()).strip().lower()


def load_sheet(workbook, name):
    ws = workbook[name]
    rows = ws.iter_rows(values_only=True)
    raw_header = [norm_header(cell) for cell in next(rows)]
    seen = {}
    headers = []
    for header in raw_header:
        if header is None:
            headers.append(None)
            continue
        if header in seen:
            seen[header] += 1
            headers.append(f"{header}__{seen[header]}")
        else:
            seen[header] = 1
            headers.append(header)
    records = []
    blanks = 0
    for row in rows:
        if not any(cell is not None and str(cell).strip() != "" for cell in row):
            blanks += 1
            continue
        record = {}
        for header, cell in zip(headers, row):
            if header:
                record[header] = cell
        records.append(record)
    return records, blanks


def pick(record, *keys):
    for key in keys:
        if key in record and record[key] is not None and str(record[key]).strip() != "":
            return record[key]
    return None


def text(value):
    if value is None:
        return ""
    return " ".join(str(value).replace("\n", " ").split()).strip()


def display_name(value):
    token = text(value)
    letters = [char for char in token if char.isalpha()]
    if letters and all(char.isupper() for char in letters):
        return token.title()
    return token


def clean_id(value):
    if value is None or isinstance(value, bool):
        return ""
    if isinstance(value, float):
        value = int(value) if value.is_integer() else value
    if isinstance(value, int):
        token = str(value)
    else:
        token = text(value)
    if token.lower() in {"", "none", "nan", "0", "0.0", "-", "n/a", "na", "nil"}:
        return ""
    digits = re.sub(r"\D", "", token)
    if len(digits) < 5:
        return ""
    return token


def parse_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 20000 < float(value) < 65000:
            return date(1899, 12, 30) + timedelta(days=int(value))
        return None
    if value is None:
        return None
    token = text(value)
    if not token:
        return None
    match = re.match(r"^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$", token)
    if match:
        day = int(match.group(1))
        month = MONTHS.get(match.group(2).upper())
        year = int(match.group(3))
        if year < 100:
            year += 2000 if year < 50 else 1900
        if month:
            try:
                return date(year, month, day)
            except ValueError:
                return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(token[:10], fmt).date()
        except ValueError:
            continue
    return None


def age_on(dob, today):
    if dob is None:
        return -1
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return years


def stage_for(grade):
    if grade in {"Nursery", "Prep", "KG", "Kachi", "ECE"}:
        return "Early Years"
    if grade.isdigit():
        number = int(grade)
        if 1 <= number <= 5:
            return "Primary"
        if 6 <= number <= 8:
            return "Middle"
        if 9 <= number <= 12:
            return "Secondary"
    return "Unknown"


def parse_class(raw):
    original = text(raw)
    if not original or original.lower() in {"none", "nan", "nil"}:
        return "Unknown", "Unknown", "", "", original
    match = re.match(r"^(\d+)\s*[-–]\s*\(\s*(science|arts)\s*\)$", original, re.I)
    if match:
        grade = str(int(match.group(1)))
        return grade, stage_for(grade), match.group(2).title(), "", original
    match = re.match(r"^(\d+)\s*[-–]\s*\(\s*([A-Za-z])\s*\)$", original)
    if match:
        grade = str(int(match.group(1)))
        return grade, stage_for(grade), "", match.group(2).upper(), original
    match = re.match(r"^(\d+)\s*(st|nd|rd|th)$", original, re.I)
    if match:
        grade = str(int(match.group(1)))
        return grade, stage_for(grade), "", "", original
    key = original.lower().replace(" ", "")
    early = {
        "nursery": "Nursery",
        "nur": "Nursery",
        "prep": "Prep",
        "perp": "Prep",
        "kachi": "Kachi",
        "ece": "ECE",
        "kg": "KG",
        "k.g": "KG",
        "kg-i": "KG",
        "k.g-i": "KG",
        "kg-ii": "KG",
        "k.g-ii": "KG",
        "kgi": "KG",
        "kgii": "KG",
    }
    if key in early:
        grade = early[key]
        return grade, stage_for(grade), "", "", original
    if key in ROMAN:
        grade = str(ROMAN[key])
        return grade, stage_for(grade), "", "", original
    if key in WORDS:
        grade = str(WORDS[key])
        return grade, stage_for(grade), "", "", original
    if re.fullmatch(r"\d+", original):
        number = int(original)
        if 0 <= number <= 12:
            grade = "Nursery" if number == 0 else str(number)
            return grade, stage_for(grade), "", "", original
    return "Unknown", "Unknown", "", "", original


def parse_gender(value):
    token = text(value).lower()
    if token in {"f", "female", "girl", "girls"}:
        return "Female"
    if token in {"m", "male", "boy", "boys"}:
        return "Male"
    return "Unknown"


def parse_yes(value):
    token = text(value).lower()
    if token in {"yes", "y"}:
        return "Yes"
    if token in {"no", "n"}:
        return "No"
    return "Unknown"


def parse_religion(value):
    token = text(value)
    if not token:
        return "Unknown"
    mapped = RELIGION.get(token.lower())
    if mapped:
        return mapped
    return token.title()


def parse_place(value, counter):
    token = text(value)
    if not token:
        return "Unknown"
    alias = PLACE_ALIASES.get(token.lower())
    if alias:
        if alias.lower() != token.lower():
            counter[f"{token} → {alias}"] += 1
        return alias
    if token.isupper():
        return token.title()
    return token


def parse_program(record, source):
    program = text(pick(record, "program"))
    project = text(pick(record, "project"))
    if program:
        return program
    if project:
        return project
    if source == "Punjab adopted schools":
        return "PEN Adoption"
    return "Not specified"


def dict_index(pool, value):
    if value not in pool:
        pool[value] = len(pool)
    return pool[value]


def main():
    workbook = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    place_alias_counts = Counter()
    religion_fixes = Counter()
    gender_raw = Counter()
    class_unknown = Counter()
    sheets_meta = []
    students = []
    keys = defaultdict(int)

    for spec in SHEETS:
        records, blanks = load_sheet(workbook, spec["name"])
        entry = {
            "sheet": spec["name"].strip(),
            "source": spec["source"],
            "rows": len(records),
            "blankRows": blanks,
            "included": spec["include"],
            "note": spec["note"],
        }
        sheets_meta.append(entry)
        if not spec["include"]:
            continue
        for record in records:
            name = display_name(pick(record, "student name")) or "Unnamed"
            father = re.sub(r"^\(F\)\s*", "", display_name(pick(record, "father name")), flags=re.I)
            bform = clean_id(pick(record, "b-form"))
            emis = clean_id(pick(record, "emis")) or text(pick(record, "emis"))
            province = parse_place(pick(record, "province"), place_alias_counts)
            district = parse_place(pick(record, "district"), place_alias_counts)
            tehsil = parse_place(pick(record, "tehsil"), place_alias_counts)
            school = text(pick(record, "school", "school name")) or "Unknown school"
            system = text(pick(record, "system")) or "Unknown"
            donor = text(pick(record, "donor")) or "Unknown"
            project = text(pick(record, "project")) or "Not specified"
            program = parse_program(record, spec["source"])
            raw_gender = text(pick(record, "gender", "gender male/female"))
            gender_raw[raw_gender or "(blank)"] += 1
            gender = parse_gender(raw_gender)
            grade, stage, stream, section, class_raw = parse_class(pick(record, "class"))
            if grade == "Unknown":
                class_unknown[class_raw or "(blank)"] += 1
            admitted = parse_date(pick(record, "admission date"))
            dob = parse_date(pick(record, "date of birth"))
            age = age_on(dob, REFERENCE)
            religion_raw = text(pick(record, "religion"))
            religion = parse_religion(religion_raw)
            if religion_raw and religion.lower() != religion_raw.lower():
                religion_fixes[f"{religion_raw} → {religion}"] += 1
            disability = parse_yes(pick(record, "disability (yes/no)", "disability yes/no"))
            afghani = parse_yes(pick(record, "afghani (yes/no)", "afghani yes/no"))
            disaster = parse_yes(
                pick(record, "disaster effected (yes/no)", "disaster effected yes/no")
            )
            year_value = pick(record, "year")
            try:
                census_year = int(year_value) if year_value is not None else 2026
            except (TypeError, ValueError):
                census_year = 2026
            identity = (
                emis,
                re.sub(r"\s+", " ", name).strip().lower(),
                re.sub(r"\s+", " ", father).strip().lower(),
                bform,
            )
            keys[identity] += 1
            students.append(
                {
                    "name": name,
                    "father": father,
                    "bform": bform,
                    "emis": emis,
                    "project": project,
                    "donor": donor,
                    "province": province,
                    "school": school,
                    "district": district,
                    "tehsil": tehsil,
                    "system": system,
                    "program": program,
                    "gender": gender,
                    "grade": grade,
                    "stage": stage,
                    "stream": stream or "Not streamed",
                    "section": section,
                    "classRaw": class_raw,
                    "admitYear": admitted.year if admitted else 0,
                    "age": age,
                    "disability": disability,
                    "afghani": afghani,
                    "disaster": disaster,
                    "religion": religion,
                    "source": spec["source"],
                    "admitted": admitted.isoformat() if admitted else "",
                    "dob": dob.isoformat() if dob else "",
                    "censusYear": census_year,
                }
            )

    workbook.close()

    string_fields = [
        "project",
        "donor",
        "province",
        "school",
        "district",
        "tehsil",
        "system",
        "program",
        "gender",
        "grade",
        "stage",
        "stream",
        "religion",
        "source",
        "disability",
        "afghani",
        "disaster",
    ]
    pools = {field: {} for field in string_fields}
    compact = []
    for student in students:
        compact.append(
            [
                student["name"],
                student["father"],
                student["bform"],
                student["emis"],
                dict_index(pools["project"], student["project"]),
                dict_index(pools["donor"], student["donor"]),
                dict_index(pools["province"], student["province"]),
                dict_index(pools["school"], student["school"]),
                dict_index(pools["district"], student["district"]),
                dict_index(pools["tehsil"], student["tehsil"]),
                dict_index(pools["system"], student["system"]),
                dict_index(pools["program"], student["program"]),
                dict_index(pools["gender"], student["gender"]),
                dict_index(pools["grade"], student["grade"]),
                dict_index(pools["stage"], student["stage"]),
                dict_index(pools["stream"], student["stream"]),
                student["section"],
                student["classRaw"],
                student["admitYear"],
                student["age"],
                dict_index(pools["disability"], student["disability"]),
                dict_index(pools["afghani"], student["afghani"]),
                dict_index(pools["disaster"], student["disaster"]),
                dict_index(pools["religion"], student["religion"]),
                dict_index(pools["source"], student["source"]),
                student["admitted"],
                student["dob"],
                student["censusYear"],
            ]
        )

    duplicate_groups = sum(1 for count in keys.values() if count > 1)
    duplicate_extra = sum(count - 1 for count in keys.values() if count > 1)
    missing_dob = sum(1 for student in students if not student["dob"])
    missing_admission = sum(1 for student in students if not student["admitted"])
    missing_bform = sum(1 for student in students if not student["bform"])
    implausible_age = sum(1 for student in students if student["age"] >= 0 and (student["age"] < 3 or student["age"] > 22))
    unknown_gender = sum(1 for student in students if student["gender"] == "Unknown")
    unknown_grade = sum(1 for student in students if student["grade"] == "Unknown")

    notes = [
        "Age is calculated as of 14 October 2026.",
        "Gender recorded as M, F, male, or female is folded into Male and Female.",
        "Grades recorded as numerals, ordinals (6th), Roman numerals (VI), or words (Three) share one scale. Science/Arts streams and section letters are kept separately.",
        "Blank B-Forms, zeros, and values with fewer than five digits are treated as missing.",
        "Darya Khan and Mankera are tehsils of Bhakkar, but the Evening School sheet stores them in the district column. The recorded column was kept.",
        "Jarwanwala and Jaranwala both appear as tehsils in the Punjab partner sheet and were not merged.",
        "Names stored in all capitals were recased for reading. A leading (F) on evening-school father names was removed.",
    ]

    payload = {
        "meta": {
            "title": "PEN Enrollment Atlas",
            "academicYear": 2026,
            "referenceDate": REFERENCE.isoformat(),
            "generatedFrom": WORKBOOK.name,
            "students": len(students),
            "sheets": sheets_meta,
            "notes": notes,
            "placeAliases": [
                {"change": change, "count": count}
                for change, count in place_alias_counts.most_common()
            ],
            "religionFixes": [
                {"change": change, "count": count}
                for change, count in religion_fixes.most_common()
            ],
            "unknownClasses": [
                {"value": value, "count": count}
                for value, count in class_unknown.most_common(20)
            ],
            "duplicateGroups": duplicate_groups,
            "duplicateExtraRows": duplicate_extra,
            "missingDob": missing_dob,
            "missingAdmission": missing_admission,
            "missingBform": missing_bform,
            "implausibleAge": implausible_age,
            "unknownGender": unknown_gender,
            "unknownGrade": unknown_grade,
        },
        "dicts": {field: [value for value, _index in sorted(pool.items(), key=lambda item: item[1])] for field, pool in pools.items()},
        "rows": compact,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} students={len(students)} bytes={OUT.stat().st_size}")
    print("programs", Counter(student["program"] for student in students))
    print("unknown classes", class_unknown.most_common(10))
    print("missing dob", missing_dob, "admission", missing_admission, "bform", missing_bform)
    print("implausible", implausible_age, "dup groups", duplicate_groups, "extra", duplicate_extra)
    print("aliases", place_alias_counts.most_common())
    print("religion", religion_fixes.most_common())
    print("gender raw", gender_raw)


if __name__ == "__main__":
    main()
