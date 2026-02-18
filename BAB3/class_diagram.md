# Class Diagram (Mermaid)

Copy kode di bawah ini ke **[Mermaid Live Editor](https://mermaid.live/)** atau **Draw.io** untuk render menjadi gambar PNG/SVG.

```mermaid
classDiagram
    %% Styling
    classDef main fill:#fff,stroke:#333,stroke-width:2px;
    classDef secondary fill:#f9f9f9,stroke:#666,stroke-width:1px;

    class User {
        +ObjectId _id
        +String username
        +String password
        +String role
        +String fullName
        +login()
        +logout()
        +changePassword()
    }

    class Market {
        +ObjectId _id
        +String name
        +String address
        +Boolean isActive
        +addMarket()
        +editMarket()
        +deleteMarket()
    }

    class Commodity {
        +ObjectId _id
        +String name
        +String unit
        +String category
        +Boolean isActive
        +addCommodity()
        +editCommodity()
        +toggleActive()
    }

    class PriceRecord {
        +ObjectId _id
        +Date date
        +Number price
        +String imageUrl
        +ObjectId marketId
        +ObjectId commodityId
        +ObjectId userId
        +inputPrice()
        +validatePrice()
        +getPriceHistory()
    }

    class ReportManager {
        +Date startDate
        +Date endDate
        +String filterMarket
        +generateExcel()
        +generatePDF()
        +getDailyAverage()
    }

    %% Relationships
    User "1" --> "0..*" PriceRecord : inputs
    Market "1" --* "0..*" PriceRecord : location
    Commodity "1" --* "0..*" PriceRecord : item
    User ..> ReportManager : uses
    ReportManager ..> PriceRecord : aggregates

    %% Apply Styles
    class User,PriceRecord main
    class Market,Commodity,ReportManager secondary
```
