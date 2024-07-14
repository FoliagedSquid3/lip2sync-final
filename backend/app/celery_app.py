from celery import Celery

# Create a Celery instance called 'app'
app = Celery(
    'app',  # Name of the Celery application
    broker='redis://localhost:6379/0',  # Redis broker URL
    backend='redis://localhost:6379/0',  # Redis backend URL for result storage
    include=['api.routes']
)
