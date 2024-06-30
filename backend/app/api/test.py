import torch

def test_load_checkpoint(path):
    try:
        checkpoint = torch.load(path, map_location=torch.device('cpu'))
        print("Checkpoint keys:", list(checkpoint.keys()))
    except Exception as e:
        print("Error loading checkpoint:", str(e))

# Update this path to your checkpoint file
checkpoint_path = r'C:\Projects\lip2sync-final\backend\app\api\SadTalker\checkpoints\facevid2vid_00189-model.pth.tar'
test_load_checkpoint(checkpoint_path)
