## api/services/chain

The chain service is responsible for basic network monitoring and interaction.
Other services rely on the chain service rather than polling networks
themselves.

`ChainService` provides

* Basic cached network information, like the latest block hash and height
* Cached account balances, account history, and transaction data
* Event subscriptions, including
  * Incoming and outgoing transactions
  * Pending transaction confirmation
  * Relevant account balance changes
  * New blocks and reorgs
* Gas estimation and transaction broadcasting
* ... and finally, polling and websocket providers for supported networks, in case a service needs to interact with a network directly.
