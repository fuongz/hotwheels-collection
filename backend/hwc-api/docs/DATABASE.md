## Hot Wheels DB Schema – Relationship Doc


### DBML Diagram

Paste into [dbdiagram.io](https://dbdiagram.io) to visualize.

```dbml
Table collection_categories {
  code text [pk, note: 'e.g. mainline, early_collection, exclusive']
  name text [not null]
  description text
}

Table collection_types {
  code text [pk, note: 'e.g. basic, premium, monster_truck']
  name text [not null]
  description text
}

Table collections {
  id integer [pk, increment]
  code text [unique, not null, note: 'e.g. mainline_2026, car_culture']
  name text [not null]
  display_name text
  description text
  category_code text [not null, ref: > collection_categories.code]
  type_code text [ref: > collection_types.code]
  scale text [note: '1:64, 1:50, mixed']
  start_year integer
  end_year integer
  is_annual boolean [not null, default: false]
  parent_id integer [ref: > collections.id, note: 'self-referential hierarchy']
  is_mainline boolean [not null, default: false]
  is_exclusive boolean [not null, default: false]
  wiki_slug text
  wiki_url text
  official_line text
  approx_item_count integer
  notes text
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    category_code [name: 'collections_category_code_idx']
    type_code [name: 'collections_type_code_idx']
    parent_id [name: 'collections_parent_id_idx']
    is_mainline [name: 'collections_is_mainline_idx']
    is_exclusive [name: 'collections_is_exclusive_idx']
    start_year [name: 'collections_start_year_idx']
    end_year [name: 'collections_end_year_idx']
    (start_year, end_year) [name: 'collections_start_end_year_idx']
  }
}

Table designers {
  id text [pk, note: 'prefix: d_']
  name text [unique, not null]
  nickname text
  country text
  wiki_slug text [unique]
  wiki_url text
  notes text
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    name [name: 'designers_name_idx']
    country [name: 'designers_country_idx']
    wiki_slug [name: 'designers_wiki_slug_idx']
  }
}

Table castings {
  id text [pk, note: 'prefix: casting_']
  code text [unique, not null, note: 'e.g. 67_camaro, bone_shaker']
  name text [not null]
  series_name text
  manufacturer text [default: 'Mattel']
  first_year integer
  body_type text [note: 'licensed, fantasy, character']
  scale text
  base_text text
  designer_display text [note: 'raw non-normalized designer string']
  avatar_url text
  wiki_slug text [unique]
  wiki_url text
  notes text
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    code [name: 'castings_code_idx']
    name [name: 'castings_name_idx']
    body_type [name: 'castings_body_type_idx']
    first_year [name: 'castings_first_year_idx']
    manufacturer [name: 'castings_manufacturer_idx']
  }
}

Table casting_designers {
  id text [pk, note: 'prefix: cd_']
  casting_id text [not null, ref: > castings.id]
  designer_id text [not null, ref: > designers.id]
  role text [note: 'lead, co_designer, retool']
  year_from integer
  year_to integer
  notes text

  indexes {
    casting_id [name: 'casting_designers_casting_id_idx']
    designer_id [name: 'casting_designers_designer_id_idx']
    (casting_id, designer_id) [name: 'casting_designers_casting_designer_idx']
  }
}

Table releases {
  id text [pk, note: 'prefix: rel_']
  casting_id text [not null, ref: > castings.id]
  collection_id integer [not null, ref: > collections.id]
  year integer
  release_name text
  color text
  tampo text
  wheel_type text [note: 'RR, OH5, MC5']
  wheel_code text
  base_color text
  base_type text
  interior_color text
  window_color text
  mainline_number text [note: 'e.g. 143/250, TH']
  sub_series_number text [note: 'e.g. 2/10']
  case_code text [note: 'e.g. A, B, C']
  release_code text [note: 'e.g. HYW18, HYW19']
  toy_index integer
  country text
  avatar_url text
  is_treasure_hunt boolean [not null, default: false]
  is_super_treasure_hunt boolean [not null, default: false]
  wiki_slug text
  wiki_url text
  notes text
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    casting_id [name: 'releases_casting_id_idx']
    collection_id [name: 'releases_collection_id_idx']
    year [name: 'releases_year_idx']
    color [name: 'releases_color_idx']
    wheel_type [name: 'releases_wheel_type_idx']
    is_treasure_hunt [name: 'releases_is_treasure_hunt_idx']
    is_super_treasure_hunt [name: 'releases_is_super_treasure_hunt_idx']
    (casting_id, collection_id) [name: 'releases_casting_collection_idx']
    (casting_id, year) [name: 'releases_casting_year_idx']
    (collection_id, year) [name: 'releases_collection_year_idx']
    release_code [name: 'releases_release_code_idx']
  }
}

Table exclusive_programs {
  id text [pk, note: 'prefix: ep_']
  code text [unique, not null, note: 'e.g. rlc, sdcc, target_red']
  name text [not null]
  description text
  kind text [note: 'club, store, event, online']
  retailer text
  country text
  wiki_slug text
  wiki_url text
  notes text

  indexes {
    kind [name: 'exclusive_programs_kind_idx']
    retailer [name: 'exclusive_programs_retailer_idx']
    country [name: 'exclusive_programs_country_idx']
  }
}

Table release_exclusives {
  id text [pk, note: 'prefix: re_']
  release_id text [not null, ref: > releases.id]
  exclusive_program_id text [not null, ref: > exclusive_programs.id]
  exclusive_type text [note: 'membership_car, selections, store_only, event_only']
  notes text

  indexes {
    release_id [name: 'release_exclusives_release_id_idx']
    exclusive_program_id [name: 'release_exclusives_exclusive_program_id_idx']
    (release_id, exclusive_program_id) [name: 'release_exclusives_release_exclusive_idx']
  }
}

Table user_cars {
  id text [pk, note: 'prefix: user_car_']
  user_id text [not null, note: 'references auth user (no FK constraint)']
  release_id text [not null, ref: > releases.id]
  quantity integer [not null, default: 1]
  notes text
  created_at timestamp [not null]
  updated_at timestamp [not null]

  indexes {
    user_id [name: 'user_cars_user_id_idx']
    release_id [name: 'user_cars_release_id_idx']
    (user_id, release_id) [name: 'user_cars_user_release_idx']
  }
}
```

***

### ERD Diagram
```markdown
┌─────────────────────┐         ┌──────────────────────┐
│ collectionCategories│         │   collectionTypes    │
│---------------------│         │----------------------│
│ code (PK)           │         │ code (PK)            │
└─────────┬───────────┘         └────────┬─────────────┘
          │                               │
          │                               │
          │                               │
          │          ┌────────────────────▼────────────────────┐
          │          │               collections               │
          │          │-----------------------------------------│
          └─────────▶│ categoryCode  (FK → collectionCategories.code)
                     │ typeCode      (FK → collectionTypes.code)
                     │ parentId      (FK → collections.id, self-ref)
                     │ id (PK), code, name, ...                │
                     └─────────────────┬───────────────────────┘
                                       │ 1..* collections
                                       │
                                       │ *..1
                     ┌─────────────────▼───────────────────────┐
                     │                releases                 │
                     │-----------------------------------------│
                     │ id (PK)                                 │
                     │ castingId   (FK → castings.id)          │
                     │ collectionId(FK → collections.id)       │
                     │ year, mainlineNumber, ...               │
                     └───────────┬─────────────┬───────────────┘
                                 │             │
                                 │ *..1        │ 1..*
             ┌───────────────────▼──┐    ┌─────▼──────────────────────┐
             │       castings       │    │        userCars             │
             │----------------------│    │-----------------------------│
             │ id (PK), code, name  │    │ id (PK)                     │
             │ firstYear, ...       │    │ userId                      │
             └───────┬──────────────┘    │ releaseId (FK → releases.id)│
                     │ 1..*             │ quantity, notes, ...        │
                     │                  └─────────────────────────────┘
                     │ *..1
       ┌─────────────▼──────────────────────────────┐
       │                castingDesigners             │
       │--------------------------------------------│
       │ id (PK)                                    │
       │ castingId  (FK → castings.id)              │
       │ designerId (FK → designers.id)             │
       │ role, yearFrom, yearTo, ...                │
       └─────────────────────────┬──────────────────┘
                                 │
                                 │ *..1
                 ┌───────────────▼─────────────────────────────┐
                 │                 designers                   │
                 │---------------------------------------------│
                 │ id (PK), name, wikiSlug, ...                │
                 └─────────────────────────────────────────────┘


          ┌─────────────────────────────┐
          │       exclusivePrograms     │
          │-----------------------------│
          │ id (PK), code, name, kind   │
          └───────────────┬─────────────┘
                          │ 1..*
                          │
                          │ *..1
          ┌───────────────▼──────────────────────────────┐
          │               releaseExclusives              │
          │----------------------------------------------│
          │ id (PK)                                      │
          │ releaseId         (FK → releases.id)         │
          │ exclusiveProgramId(FK → exclusivePrograms.id)│
          │ exclusiveType, notes                         │
          └──────────────────────────────────────────────┘
```

### High-level Entities

- `collections`: lines/series, e.g. "Mainline 2026", "Car Culture", "Red Line Club".
- `castings`: base models (the metal "mold"), e.g. `'67 Camaro`, `Bone Shaker`. [reddit](https://www.reddit.com/r/HotWheels/comments/tzraa3/what_is_a_casting/)
- `releases`: concrete releases of a casting in a given year/collection/color (variation-level). [164custom](https://164custom.com/hot-wheels-release-dates_HW.html)
- `exclusivePrograms`: programs or channels that make a release exclusive (RLC, Target Red Edition, SDCC, Walmart-only). [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
- `releaseExclusives`: link table between releases and exclusive programs (many-to-many).
- `designers`: people credited as designers of castings.
- `castingDesigners`: link table between castings and designers (many-to-many).
- `collectionCategories`: high-level collection classification (mainline, modern_special, exclusive, etc.). [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Category:Lists_of_Hot_Wheels_by_year)
- `collectionTypes`: sub-type of collection (basic, premium, monster_truck, track_set, etc.). [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `userCars`: user's saved/collected releases with quantity and notes.

### ID Prefixes

All text-based primary keys use nanoid with a table-specific prefix:

| Table               | Prefix        | Example             |
|---------------------|---------------|---------------------|
| `designers`         | `d_`          | `d_abc123`          |
| `castings`          | `casting_`    | `casting_abc123`    |
| `castingDesigners`  | `cd_`         | `cd_abc123`         |
| `releases`          | `rel_`        | `rel_abc123`        |
| `exclusivePrograms` | `ep_`         | `ep_abc123`         |
| `releaseExclusives` | `re_`         | `re_abc123`         |
| `userCars`          | `user_car_`   | `user_car_abc123`   |

`collections` uses an auto-increment integer PK.

***

## Table: collectionCategories

**Purpose:** High-level category for a collection (semantic bucket).

Typical values:

- `mainline` – main yearly basic lines ("List of 2026 Hot Wheels"). [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Category:Lists_of_Hot_Wheels_by_year)
- `early_collection` – early classic lines (e.g. Flying Colors, Super Chromes). [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `early_special` – early special series (Action Packs, Color Changers). [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `modern_special` – modern premium/special lines (Car Culture, Pop Culture). [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `modern_series` – Monster Trucks, Skate, Starships, RC, etc. [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `exclusive` – Red Line Club, HWC.com, SDCC exclusives. [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
- `larger_scale` – 1:43, 1:50, etc. [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `misc` – multipacks, mixed/uncategorized.

**Key fields:**

- `code` (PK, string)
- `name` (string)
- `description` (string, nullable)

**Relationships:**

- 1 `collectionCategory` → N `collections` via `collections.categoryCode`.

***

## Table: collectionTypes

**Purpose:** More precise type of collection.

Example values:

- `basic` – mainline basic cars. [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `premium` – Car Culture, Boulevard, RLC-style premium. [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
- `multi_pack` – 5-packs, 6-packs, etc. [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `monster_truck` – Monster Trucks. [en.wikipedia](https://en.wikipedia.org/wiki/Hot_Wheels)
- `track_set`, `character_cars`, `rc`, `id`, etc.

**Key fields:**

- `code` (PK, string)
- `name` (string)
- `description` (string, nullable)

**Relationships:**

- 1 `collectionType` → N `collections` via `collections.typeCode`.

***

## Table: collections

**Purpose:** Represents a line, series, or list – e.g. "Mainline 2026", "Car Culture", "Red Line Club 2024". [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Category:Lists_of_Hot_Wheels_by_year)

**Key fields:**

- `id` (PK, integer, auto-increment)
- `code` (unique, slug; e.g. `mainline_2026`, `car_culture`)
- `name` – human name ("Mainline 2026")
- `displayName` – optional display name
- `description`
- `categoryCode` (FK → `collectionCategories.code`)
- `typeCode` (FK → `collectionTypes.code`, nullable)
- `scale` – e.g. `1:64`, `1:50`, `mixed`
- `startYear` / `endYear` – lifespan of this collection
- `isAnnual` (boolean) – true for yearly lists like "List of 2026 Hot Wheels". [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Category:Lists_of_Hot_Wheels_by_year)
- `parentId` (FK → `collections.id`) – for hierarchy: a collection can have a parent collection.
  - Example: parent `Car Culture`, child `Car Culture: Team Transport`.
- `isMainline` (boolean) – true for mainline basic lines.
- `isExclusive` (boolean) – true if the collection itself is an exclusive program line.
- `wikiSlug`, `wikiUrl`, `officialLine`, `approxItemCount`, `notes`
- `createdAt`, `updatedAt`

**Relationships:**

- 1 `collectionCategory` → N `collections`.
- 1 `collectionType` → N `collections`.
- Hierarchical: 1 parent `collection` → N child `collections` via `parentId`.
- 1 `collection` → N `releases`.

***

## Table: castings

**Purpose:** Base model / "mold" that can be reused many times over the years with different colors, wheels, decos. [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Die-cast)

**Key fields:**

- `id` (PK, text, prefix `casting_`)
- `code` (unique) – internal slug (e.g. `67_camaro`, `bone_shaker`)
- `name` – commercial name (`'67 Camaro`, `Bone Shaker`)
- `seriesName` – original sub-series if relevant
- `manufacturer` – usually `Mattel`
- `firstYear` – year the casting first appeared. [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Category:Lists_of_Hot_Wheels_by_year)
- `bodyType` – `licensed` (real car), `fantasy`, `character`
- `scale` – `1:64`, `1:50`, etc.
- `baseText` – text embossed on the base
- `designerDisplay` – raw, non-normalized designer string (for reference)
- `avatarUrl` – representative image URL
- `wikiSlug` (unique), `wikiUrl`
- `notes`
- `createdAt`, `updatedAt`

**Relationships:**

- 1 `casting` → N `releases`.
- N `castings` ↔ N `designers` via `castingDesigners`.

***

## Table: releases

**Purpose:** A specific release of a casting in a given collection/year/color/variation. This is the checklist-level item collectors track. [164custom](https://164custom.com/hot-wheels-release-dates_HW.html)

**Key fields:**

- `id` (PK, text, prefix `rel_`)
- `castingId` (FK → `castings.id`)
- `collectionId` (FK → `collections.id`)
- `year` – release year
- `releaseName` – variation name if applicable
- `color`
- `tampo` – deco/graphics
- `wheelType` – e.g. `RR`, `OH5`, `MC5`
- `wheelCode` – wheel code identifier
- `baseColor`
- `baseType` – base material/type
- `interiorColor`
- `windowColor`
- `mainlineNumber` – e.g. `143/250`, `TH`
- `subSeriesNumber` – e.g. `2/10` in a mini collection
- `caseCode` – case letter, e.g. `A`, `B`, `C`. [164custom](https://164custom.com/hot-wheels-release-dates_HW.html)
- `releaseCode` – product release code (e.g. `HYW18`, `HYW19`)
- `toyIndex` – numeric index within the release
- `country` – country of origin/release
- `avatarUrl` – image URL for this specific release
- `isTreasureHunt` (boolean)
- `isSuperTreasureHunt` (boolean)
- `wikiSlug`, `wikiUrl`, `notes`
- `createdAt`, `updatedAt`

**Relationships:**

- 1 `casting` → N `releases`.
- 1 `collection` → N `releases`.
- N `releases` ↔ N `exclusivePrograms` via `releaseExclusives`.
- 1 `release` → N `userCars`.

***

## Table: exclusivePrograms

**Purpose:** Describes an exclusive "channel" or "program" that constrains where/how a release is available. [creations.mattel](https://creations.mattel.com/en-sg/collections/hot-wheels-red-line-club)

Examples:

- `rlc` – Red Line Club (membership-only). [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
- `sdcc` – San Diego Comic-Con exclusive.
- `target_red` – Target Red Edition (store-exclusive).
- `walmart_zamac` – Walmart ZAMAC exclusives.

**Key fields:**

- `id` (PK, text, prefix `ep_`)
- `code` (unique) – e.g. `rlc`, `sdcc`, `target_red`
- `name` – "Red Line Club", "San Diego Comic-Con"
- `description`
- `kind` – high-level kind: `club`, `store`, `event`, `online`
- `retailer` – if store-based (`Target`, `Walmart`, etc.)
- `country` – `US`, `VN`, etc.
- `wikiSlug`, `wikiUrl`, `notes`

**Relationships:**

- 1 `exclusiveProgram` → N `releaseExclusives`.
- N `exclusivePrograms` ↔ N `releases` via `releaseExclusives`.

***

## Table: releaseExclusives

**Purpose:** Join table between `releases` and `exclusivePrograms` (many-to-many).

**Key fields:**

- `id` (PK, text, prefix `re_`)
- `releaseId` (FK → `releases.id`, cascade delete)
- `exclusiveProgramId` (FK → `exclusivePrograms.id`, cascade delete)
- `exclusiveType` – e.g.:
  - `membership_car` (RLC membership car) [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
  - `selections` (RLC sELECTIONs) [hotwheels.fandom](https://hotwheels.fandom.com/wiki/Red_Line_Club)
  - `store_only`
  - `event_only`
- `notes`

**Relationships:**

- N `releases` ↔ N `exclusivePrograms`.

***

## Table: designers

**Purpose:** People credited for designing castings.

**Key fields:**

- `id` (PK, text, prefix `d_`)
- `name` (unique) – e.g. `Larry Wood`, `Ryu Asada`
- `nickname`
- `country`
- `wikiSlug` (unique), `wikiUrl`
- `notes`
- `createdAt`, `updatedAt`

**Relationships:**

- N `designers` ↔ N `castings` via `castingDesigners`.

***

## Table: castingDesigners

**Purpose:** Join table between `castings` and `designers`, capturing roles and time windows.

**Key fields:**

- `id` (PK, text, prefix `cd_`)
- `castingId` (FK → `castings.id`, cascade delete)
- `designerId` (FK → `designers.id`, cascade delete)
- `role` – e.g. `lead`, `co_designer`, `retool`
- `yearFrom` / `yearTo` – optional, if relevant
- `notes`

**Relationships:**

- N `castings` ↔ N `designers`.

***

## Table: userCars

**Purpose:** Tracks which releases a user has in their collection, with quantity and personal notes.

**Key fields:**

- `id` (PK, text, prefix `user_car_`)
- `userId` – references the auth user (not a FK constraint; managed by better-auth)
- `releaseId` (FK → `releases.id`, cascade delete)
- `quantity` (integer, default `1`)
- `notes`
- `createdAt`, `updatedAt`

**Relationships:**

- 1 `release` → N `userCars`.

***

## Relationship Summary (Text ERD)

- `collectionCategories` 1 → N `collections`.
- `collectionTypes` 1 → N `collections`.
- `collections` 1 → N `collections` (self-referential, parent/child).
- `collections` 1 → N `releases`.
- `castings` 1 → N `releases`.
- `exclusivePrograms` 1 → N `releaseExclusives`.
- `releases` 1 → N `releaseExclusives`.
- `releases` 1 → N `userCars`.
- `designers` N ↔ N `castings` via `castingDesigners`.
- `exclusivePrograms` N ↔ N `releases` via `releaseExclusives`.
