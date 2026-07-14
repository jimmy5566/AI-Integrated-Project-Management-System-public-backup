from fastapi import APIRouter
 
from app.api.routes import (
    customers,
    employees,
    invoices,
    login,
    materials,
    notifications,
    project_subtasks,
    projects,
    roles,
    statuses,
    subcontractors,
    users,
    utils,
    workforce_allocate,
)

from app.core.config import settings
 

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(invoices.router)
api_router.include_router(utils.router)
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(statuses.router)
api_router.include_router(employees.router)
api_router.include_router(customers.router)
api_router.include_router(workforce_allocate.router)
api_router.include_router(project_subtasks.router)
api_router.include_router(materials.router)
api_router.include_router(subcontractors.router)
api_router.include_router(notifications.router)

# if settings.ENVIRONMENT == "local":
#     api_router.include_router(private.router)

