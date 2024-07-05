from argparse import Namespace
import os
import torch

script_dir = os.path.dirname(os.path.abspath(__file__))
sadtalker_path = os.path.join(script_dir, 'SadTalker')
import sys
sys.path.append(sadtalker_path)
from inference import main as sadtalker_inference
# sys.path.remove(sadtalker_path)

def execute_script(audio_path, img_path, result_dir, job_id, user_id):
    job_output_dir = os.path.join(result_dir, str(job_id))
    os.makedirs(job_output_dir, exist_ok=True)
    video_output_path = os.path.join(job_output_dir, f"{user_id}.mp4")

    args = Namespace(driven_audio=audio_path,
    source_image=img_path,
    ref_eyeblink='/mnt/c/Users/shayaan/Desktop/lip2sync/lip2sync-final/backend/app/api/SadTalker/examples/ref_video/WDA_KatieHill_000.mp4',
    ref_pose='/mnt/c/Users/shayaan/Desktop/lip2sync/lip2sync-final/backend/app/api/SadTalker/examples/ref_video/WDA_KatieHill_000.mp4',
    checkpoint_dir=f"{sadtalker_path}/checkpoints",
    result_dir=video_output_path,
    pose_style=0,
    batch_size=2,
    size=256,
    expression_scale=1.0,
    input_yaw=None,
    input_pitch=None,
    input_roll=None,
    enhancer='gfpgan',
    background_enhancer=None,
    cpu=False,
    face3dvis=False,
    still=True,
    preprocess='full',
    verbose=False,
    old_version=False,
    net_recon='resnet50',
    init_path=None,
    use_last_fc=False,
    bfm_folder='./checkpoints/BFM_Fitting/',
    bfm_model='BFM_model_front.mat',
    focal=1015.0,
    center=112.0,
    camera_d=10.0,
    z_near=5.0,
    z_far=15.0)
    
    if torch.cuda.is_available() and not args.cpu:
        args.device = "cuda"
    else:
        args.device = "cpu"

    sadtalker_inference(args, sadtalker_path)


