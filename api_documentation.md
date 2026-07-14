# API Documentation

Base URL: `/api/v1`

All authenticated endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Projects](#3-projects)
4. [Invoices](#4-invoices)
5. [Statuses](#5-statuses)
6. [Utilities](#6-utilities)

---

## 1. Authentication

### POST `/login/access-token`
OAuth2 login — returns a JWT access token.

**Auth**: None

**Request** (form data):
| Field | Type | Required |
|-------|------|----------|
| username | string (email) | Yes |
| password | string | Yes |

**Response** `200`:
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

---

### POST `/login/test-token`
Validates the current Bearer token and returns the authenticated user.

**Auth**: Bearer token required

**Request**: None

**Response** `200` — `UserPublic`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "is_superuser": false,
  "full_name": "string | null",
  "employee_id": "uuid | null",
  "created_at": "datetime | null"
}
```

---

### POST `/password-recovery/{email}`
Sends a password reset email if the address is registered.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| email | string | Yes |

**Response** `200`:
```json
{
  "message": "If that email is registered, we sent a password recovery link"
}
```

---

### POST `/reset-password/`
Resets the user's password using a valid reset token.

**Auth**: None

**Request Body** — `NewPassword`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| token | string | — | Yes |
| new_password | string | min 8, max 128 chars | Yes |

**Response** `200`:
```json
{
  "message": "Password updated successfully"
}
```

---

### POST `/password-recovery-html-content/{email}`
Returns the HTML email content for a password recovery email (admin preview).

**Auth**: Superuser required

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| email | string | Yes |

**Response** `200`: HTML content (HTMLResponse)

---

## 2. Users

### GET `/users/`
Retrieve a paginated list of all users.

**Auth**: Superuser required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | integer | 0 | Records to skip |
| limit | integer | 100 | Max records to return |

**Response** `200` — `UsersPublic`:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "is_active": true,
      "is_superuser": false,
      "full_name": "string | null",
      "employee_id": "uuid | null",
      "created_at": "datetime | null"
    }
  ],
  "count": 0
}
```

---

### GET `/users/time_log/{date}`
Get total working hours per employee since a given date.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Format | Required |
|-----------|------|--------|----------|
| date | string | `dd-mm-yyyy` | Yes |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_ids | UUID[] | No | Filter to specific users; omit to return all employees with logged hours |

**Response** `200` — `EmployeeHoursResponse`:
```json
{
  "data": [
    {
      "employee_id": "uuid",
      "name": "string | null",
      "working_hours": "decimal",
      "role": "string | null"
    }
  ],
  "count": 0
}
```

**Error Responses**:
| Status | Description |
|--------|-------------|
| 400 | Invalid date format |

---

### GET `/users/all-users`
Retrieve all users with their associated role details.

**Auth**: Superuser required

**Response** `200` — `UsersDetail`:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "string | null",
      "role": "string | null"
    }
  ],
  "count": 0
}
```

---

### POST `/users/`
Create a new user account.

**Auth**: Superuser required

**Request Body** — `AdminUserCreate`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| email | string (email) | max 255 chars | Yes |
| password | string | min 8, max 128 chars | Yes |
| role_name | string \| null | max 100 chars | No |

**Response** `200` — `UserPublic`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "is_superuser": false,
  "full_name": "string | null",
  "employee_id": "uuid | null",
  "created_at": "datetime | null"
}
```

---

### GET `/users/me`
Get the currently authenticated user's profile.

**Auth**: Bearer token required

**Response** `200` — `UserProfile`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_superuser": false,
  "first_name": "string | null",
  "last_name": "string | null",
  "full_name": "string | null",
  "role_name": "string | null",
  "is_active": true
}
```

---

### PATCH `/users/me`
Update the currently authenticated user's own profile.

**Auth**: Bearer token required

**Request Body** — `UserUpdateMe`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| full_name | string \| null | max 255 chars | No |
| email | string (email) \| null | max 255 chars | No |

**Response** `200` — `UserPublic` (see above)

---

### PATCH `/users/me/password`
Update the currently authenticated user's password.

**Auth**: Bearer token required

**Request Body** — `UpdatePassword`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| current_password | string | min 8, max 128 chars | Yes |
| new_password | string | min 8, max 128 chars | Yes |

**Response** `200`:
```json
{
  "message": "Password updated successfully"
}
```

---

### GET `/users/{user_id}`
Get a specific user by ID. Non-superusers can only retrieve their own record.

**Auth**: Bearer token required (superuser required to view other users)

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| user_id | UUID | Yes |

**Response** `200` — `UserPublic` (see above)

---

### PATCH `/users/{user_id}`
Update any user's details.

**Auth**: Superuser required

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| user_id | UUID | Yes |

**Request Body** — `UserUpdate`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| email | string (email) \| null | max 255 chars | No |
| is_active | boolean \| null | — | No |
| is_superuser | boolean \| null | — | No |
| full_name | string \| null | max 255 chars | No |
| password | string \| null | min 8, max 128 chars | No |
| role_name | string \| null | max 100 chars | No |

**Response** `200` — `UserPublic` (see above)

---

### DELETE `/users/{user_id}`
Delete a user. Superusers cannot delete their own account.

**Auth**: Superuser required

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| user_id | UUID | Yes |

**Response** `200`:
```json
{
  "message": "User deleted successfully"
}
```

---

## 3. Projects

### POST `/projects`
Create a new project.

**Auth**: Bearer token required

**Request Body** — `ProjectCreateRequest`:
| Field | Type | Constraints | Required |
|-------|------|-------------|----------|
| job_number | string | — | Yes |
| project_types | string | default: `"civil"` | No |
| project_name | string | — | Yes |
| client_name | string | — | Yes |
| client_company | string \| null | — | No |
| client_contact | string \| null | — | No |
| client_address | string \| null | — | No |
| fee_estimate | decimal \| null | max 10 digits, 2 decimal places | No |
| date_received | date | — | Yes |
| start_date | date | — | Yes |
| due_date | date | — | Yes |

**Response** `200` — `ProjectCreateResponse`:
```json
{
  "project_id": "uuid",
  "message": "project created successfully"
}
```

---

### GET `/projects`
Get all projects, optionally filtered by status.

**Auth**: None

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string \| null | No | Filter by project status |

**Response** `200` — `ProjectDetailsResponse`:
```json
{
  "data": [
    {
      "project_id": "uuid",
      "job_number": "string",
      "project_name": "string | null",
      "company_name": "string | null",
      "company_address": "string | null",
      "client_name": "string | null",
      "status": "string | null",
      "start_date": "date | null",
      "due_date": "date | null",
      "days_elapsed": "integer | null",
      "fee_estimate": "decimal | null"
    }
  ],
  "count": 0
}
```

---

### GET `/projects/all-project`
Get a summary list of all active projects.

**Auth**: Superuser required

**Response** `200` — `ProjectsListResponse`:
```json
{
  "data": [
    {
      "project_id": "uuid",
      "project_name": "string | null",
      "client_name": "string | null",
      "project_manager_name": "string | null",
      "days_since_started": "integer | null"
    }
  ],
  "count": 0
}
```

---

### GET `/projects/delay-project`
Get all projects that are delayed.

**Auth**: Superuser required

**Response** `200` — `ProjectsListResponse` (same shape as `/projects/all-project`)

---

### GET `/projects/current-project-num`
Get the count of active projects for the current month vs the previous month.

**Auth**: Superuser required

**Response** `200` — `MonthlyCountResponse`:
```json
{
  "current_month": 0,
  "previous_month": 0
}
```

---

### GET `/projects/completed-project`
Get the count of completed projects for the current month vs the previous month.

**Auth**: Superuser required

**Response** `200` — `MonthlyCountResponse`:
```json
{
  "current_month": 0,
  "previous_month": 0
}
```

---

### GET `/projects/overdue`
Get all active projects that are past their due date and not yet completed.

**Auth**: None

**Response** `200` — `ProjectDetailsResponse`:
```json
{
  "data": [
    {
      "project_id": "uuid",
      "job_number": "string",
      "project_name": "string | null",
      "company_name": "string | null",
      "company_address": "string | null",
      "client_name": "string | null",
      "status": "string | null",
      "start_date": "date | null",
      "due_date": "date | null",
      "days_elapsed": "integer | null",
      "fee_estimate": "decimal | null"
    }
  ],
  "count": 0
}
```

---

### GET `/projects/expected-to-finish/{date}`
Get all active projects whose due date falls on or before the given date and are not yet completed.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Format | Required |
|-----------|------|--------|----------|
| date | string | `dd-mm-yyyy` | Yes |

**Response** `200` — `ProjectDetailsResponse` (same shape as `/projects/overdue`)

**Error Responses**:
| Status | Description |
|--------|-------------|
| 400 | Invalid date format |

---

### GET `/projects/invoice-bill`
Get the total invoice amounts for the current month vs the previous month.

**Auth**: Superuser required

**Response** `200` — `MonthlyInvoiceResponse`:
```json
{
  "current_month_total": "decimal",
  "previous_month_total": "decimal"
}
```

---

### GET `/projects/{project_id}`
Get full details of a specific project.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| project_id | UUID | Yes |

**Response** `200` — `ProjectDetail`:
```json
{
  "project_id": "uuid",
  "job_number": "string",
  "project_name": "string | null",
  "company_name": "string | null",
  "company_address": "string | null",
  "client_name": "string | null",
  "status": "string | null",
  "start_date": "date | null",
  "due_date": "date | null",
  "days_elapsed": "integer | null",
  "fee_estimate": "decimal | null"
}
```

---

### PATCH `/projects/{project_id}`
Update a project's details.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| project_id | UUID | Yes |

**Request Body** — `ProjectUpdateRequest`:
| Field | Type | Required |
|-------|------|----------|
| project_name | string \| null | No |
| project_types | string \| null | No |
| status | string \| null | No |
| date_received | date \| null | No |
| start_date | date \| null | No |
| due_date | date \| null | No |
| fee_estimate | decimal \| null | No |

**Response** `200`:
```json
{
  "message": "Project updated successfully"
}
```

---

### DELETE `/projects/{project_id}`
Delete a specific project by ID.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| project_id | UUID | Yes |

**Response** `200`:
```json
{
  "message": "Project deleted successfully"
}
```

---

### DELETE `/projects`
Delete all projects.

**Auth**: None

**Response** `200`:
```json
{
  "message": "Deleted X projects successfully"
}
```

---

## 4. Invoices

### GET `/invoices/finish/{date}`
Return invoices issued since `date` that are overdue — issued more than 14 days ago and not yet paid.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Format | Required |
|-----------|------|--------|----------|
| date | string | `dd-mm-yyyy` | Yes |

**Response** `200` — `InvoiceListResponse`:
```json
{
  "data": [
    {
      "invoice_id": "uuid",
      "project_id": "uuid",
      "project_name": "string | null",
      "invoice_number": "string",
      "invoice_date": "date | null",
      "invoice_amount": "decimal | null",
      "paid_date": "date | null"
    }
  ],
  "count": 0,
  "total": "decimal"
}
```

**Error Responses**:
| Status | Description |
|--------|-------------|
| 400 | Invalid date format |

---

### GET `/invoices/expected/{date}`
Return invoices not yet issued (`invoice_date` is null) on active projects whose `due_date` is on or before `date`, plus the total expected value.

**Auth**: None

**Path Parameters**:
| Parameter | Type | Format | Required |
|-----------|------|--------|----------|
| date | string | `dd-mm-yyyy` | Yes |

**Response** `200` — `InvoiceListResponse` (same shape as `/invoices/finish/{date}`)

**Error Responses**:
| Status | Description |
|--------|-------------|
| 400 | Invalid date format |

---

## 5. Statuses

### GET `/statuses`
Get all available project status values.

**Auth**: None

**Response** `200`:
```json
["active", "completed", "on_hold", "..."]
```

---

## 6. Utilities

### GET `/utils/health-check/`
Simple health check to confirm the API is running.

**Auth**: None

**Response** `200`:
```json
true
```

---

### POST `/utils/test-email/`
Send a test email to a specified address.

**Auth**: Superuser required

**Query Parameters**:
| Parameter | Type | Required |
|-----------|------|----------|
| email_to | string (email) | Yes |

**Response** `201`:
```json
{
  "message": "Test email sent"
}
```


---

# Upcoming API Features (UG Team)

## Users

### GET `/users/all-users` (fix from existence function)

Retrieve all users including their name, email, and role. **No superuser privilege required** — any authenticated user may call this endpoint (used by the frontend to populate workforce selection dropdowns).

**Auth:** Bearer token (any active user)

**Response** `200`:
```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "john.doe@example.com",
      "full_name": "John Doe",
      "role": "Engineer"
    }
  ],
  "count": 1
}
```

---

## Workforce Allocation - Igie , post, patch, delete while markus on users

All three endpoints below operate on the `project_assignments` table and are restricted to the **project owner or a superuser**. Every successful mutation is written to an audit log table recording who made the change, when, and what was modified.

---

### POST `/project/{project_id}/workforce-allocate`

Add one or more employees to a project. The request body is a list of assignment objects — each specifying a user and their role on the project. Existing assignments for the same employee are not affected.

**Auth:** Bearer token (project owner or superuser)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | UUID | Yes | Target project |

**Request Body:**
```json
[
  {
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "role_id": "8a1bc234-1234-4abc-9def-000000000001"
  },
  {
    "user_id": "7bc96e45-aaaa-4321-bbbb-111111111111",
    "role_id": "8a1bc234-1234-4abc-9def-000000000002"
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | UUID | Yes | UUID of the user to assign |
| role_id | UUID | Yes | UUID of the role this user will hold on the project |

**Response** `201`:
```json
{
  "assigned": 2,
  "data": [
    {
      "id": "assignment-uuid",
      "project_id": "project-uuid",
      "employee_id": "employee-uuid",
      "role_id": "role-uuid",
      "created_at": "2026-04-22T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Caller is not the project owner or a superuser |
| 404 | Project, user, or role not found |
| 409 | One or more users are already assigned to this project |

---

### PATCH `/project/{project_id}/workforce-allocate`

Update the role of one or more existing project assignments. Only the `role_id` field may be changed via this endpoint; to reassign a different employee, use DELETE then POST.

**Auth:** Bearer token (project owner or superuser)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | UUID | Yes | Target project |

**Request Body:**
```json
[
  {
    "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "role_id": "8a1bc234-1234-4abc-9def-000000000003"
  }
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | UUID | Yes | UUID of the already-assigned user |
| role_id | UUID | Yes | New role UUID to apply |

**Response** `200`:
```json
{
  "updated": 1,
  "data": [
    {
      "id": "assignment-uuid",
      "project_id": "project-uuid",
      "employee_id": "employee-uuid",
      "role_id": "new-role-uuid",
      "created_at": "2026-04-22T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Caller is not the project owner or a superuser |
| 404 | Project, user, role, or existing assignment not found |

---

### DELETE `/project/{project_id}/workforce-allocate`

Remove one or more employees from a project. Sends a list of user UUIDs; all matching assignments for those users on this project are deleted.

**Auth:** Bearer token (project owner or superuser)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | UUID | Yes | Target project |

**Request Body:**
```json
{
  "user_ids": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "7bc96e45-aaaa-4321-bbbb-111111111111"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_ids | UUID[] | Yes | List of user UUIDs to remove from the project |

**Response** `200`:
```json
{
  "removed": 2,
  "message": "Workforce allocation updated successfully"
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Caller is not the project owner or a superuser |
| 404 | Project not found or one or more users have no assignment on this project |

---

### Audit Logging

Every POST, PATCH, and DELETE call to the workforce-allocate endpoints writes a record to the audit log table with:

| Field | Description |
|-------|-------------|
| `action` | `"assign"`, `"update_role"`, or `"remove"` |
| `project_id` | Project that was modified |
| `target_user_ids` | Array of affected user UUIDs |
| `performed_by` | UUID of the authenticated user who made the call |
| `timestamp` | UTC datetime of the operation |
| `changes` | JSON snapshot of what was added / changed / removed |