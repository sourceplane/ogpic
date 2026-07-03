# Notifications Client

Client library for the Ogpic notifications service. It provides a typed way for
other components to enqueue and send notifications through the platform's
notifications worker.

## Responsibilities
- Expose a typed client for the notifications service.
- Encapsulate the request shapes and calling conventions for notifications.
- Keep notification delivery details out of calling components.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
