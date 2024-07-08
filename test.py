import torch

if torch.cuda.is_available():
    print("CUDA is available")
    # Get the number of CUDA devices
    print(f"Number of CUDA devices: {torch.cuda.device_count()}")
    # Get CUDA device name
    print(f"CUDA Device Name: {torch.cuda.get_device_name(0)}")
else:
    print("CUDA is not available")