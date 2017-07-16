# ARNAC - A RESTful Node.js API Codebase
ARNAC is a REST API that I wrote in Node.js. ARNAC was used to power the back-end
for a proof-of-concept project. The project has since progressed and is no longer
using this codebase. Instead of simply archiving the codebase I've decided to
release it as an example API written in Node.js.

Business specific logic was redacted prior to releasing the project, rendering
the application more of a codebase than a working API. Even with the primary
business logic redacted the codebase provides several examples of common API
patterns; registration, user/account relationship and handling, authentication
using JWT tokens, polymorphic user comment system, a billing workflow of orders
to invoices, and invoice payment using multiple currencies, to name a few.

There are acceptance test which should paint a picture of how the endpoints were
expected to work.

**TECH STACK**
- Framework: HapiJs
- Database: Postgres using Knex.js/Bookshelf.js
- Auth: JWT
- TDD/BDD: Mocha, code
- JSONAPI

## PATTERNS
**Registration:** Registration is organized with the auth code. ARNAC uses a
user/account model relationship. Every user must belong to an account and an
account can have multiple users.

**JWT Authenication**: Authentication using JWT tokens can also be found in the
auth code.

**Billing:** Billing is split between a couple regions -- which i wouldn't do in
hindsight. order, invoice, payment, and product all play their respective roles
in the billing cycle. Majority of the functionality/business logic can be found
in payment/cashier.js.

**Comments**: The structure behind comments can be found in comments section.
For a concrete example there are request-comments within the request section.
Note that Request is one of the heavily redacted areas.

## NOTES
- ARNAC in no way illustrates the proper way to write node API's, nor is it an
  example of how to write node code, it is an example of an API written under
  deadlines and needing to get stuff done.
