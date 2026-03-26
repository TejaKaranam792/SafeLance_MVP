import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  JobCreated,
  MilestoneAdded,
  MilestoneFunded,
  MilestoneSubmitted,
  MilestoneApproved,
  MilestoneDisputed,
  MilestoneRefunded,
  DisputeResolved
} from "../generated/MilestoneEscrow/MilestoneEscrow"
import { Job, Milestone } from "../generated/schema"

export function handleJobCreated(event: JobCreated): void {
  let job = new Job(event.params.jobId.toString())
  job.client = event.params.client
  job.title = event.params.title
  job.milestoneCount = event.params.milestoneCount
  job.save()
}

export function handleMilestoneAdded(event: MilestoneAdded): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = new Milestone(id)
  milestone.job = event.params.jobId.toString()
  milestone.index = event.params.milestoneIndex
  milestone.freelancer = event.params.freelancer
  milestone.title = event.params.title
  milestone.amount = event.params.amount
  milestone.status = 0 // Pending
  milestone.save()
}

export function handleMilestoneFunded(event: MilestoneFunded): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    milestone.status = 1 // Funded
    milestone.save()
  }
}

export function handleMilestoneSubmitted(event: MilestoneSubmitted): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    milestone.status = 2 // Submitted
    milestone.save()
  }
}

export function handleMilestoneApproved(event: MilestoneApproved): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    milestone.status = 3 // Approved
    milestone.save()
  }
}

export function handleMilestoneDisputed(event: MilestoneDisputed): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    milestone.status = 4 // Disputed
    milestone.save()
  }
}

export function handleMilestoneRefunded(event: MilestoneRefunded): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    milestone.status = 5 // Refunded
    milestone.save()
  }
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let id = event.params.jobId.toString() + "-" + event.params.milestoneIndex.toString()
  let milestone = Milestone.load(id)
  if (milestone != null) {
    if (event.params.releasedToFreelancer) {
      milestone.status = 3 
    } else {
      milestone.status = 5 
    }
    milestone.save()
  }
}
