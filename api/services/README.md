Services
========

The extension backend is organized into several different, largely independent
services, each responsible for their own external communications and data
persistence.

In contrast to the architecture preferred by simple web services — a single REST
interface synchronously managing data per request — this architecture prefers
services that are constantly monitoring, indexing, and caching data, pushing the
results to data stores and UI asynchronously.

Grouping business rules and control flow into these services means
* Explicit dependencies provided via service constructors
* Consistent asynchronous startup and teardown procedures
* Namespacing and data migrations per service, rather than a single global data
  store. This pattern offers flexibilit and resilience at the expense of more
  data management logic.
* Clear boundaries for testing system behavior in the future
