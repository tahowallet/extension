## api/services/indexing

The indexing service is responsible for pulling and maintaining all application-
level "indexing" data — things like fungible token balances and NFTs, as well as
other application concepts like governance proposals.

`IndexingService` maintains its own data store, separate from vital user data like keys
and preferences, as well as lower-level chain state information like blocks and
transactions.
