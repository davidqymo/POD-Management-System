As POD Team manager,  I need to create one POD Team management system,  it should have serveral modules/function

1. Resource Management
   I can manage the resource with base information, e.g. staff ID, name, CostCenter, Billable Team code, category (e.g. contractor or permanent staff), skill(Java, IBMi)), level (SE,SSE,CS, SCS).  Resource information can be uploaded by csv
   Underrstand Cost Center, there's billable team code,  which have unit rate (month rate in USD),  also can convert to hours rate (unit rate devide into 144 hours), this information will be changed and have effective date.
2. Project Management information
   Project have Request ID,  Billable Product ID,  Clarity ID,  total budget.  it should have project schedule management function, e.g.  capture the project activities e.g.  Intake inited,  T-ShirtSizing Estimated, T0-Estimation,  Budget approve,  BP interlocked(milestone)), Resource Allocated(milestone), Business Requirement preparation,  Business Requirement signoff(milestone)),   Solution Design build,  Solution Design approved(milestone),  Technical Design, Developement Buid,  CodeDrop-SIT, System Testing strategy,   SIT Test Case build,  SIT execution. SIT signoff.   CodeDrop - UAT,   UAT execution,  UAT signoff.   Code-Drop- production,  Release preparation,  Release execution,  Post Implementation support,  Handover and project closure.   Those activities can be customized and maintaint.  we can plan the activities in the calendard  between project start and end.
3. Resource Allcation and Monitoring
   Different Level of the resource need to be allocated into the projects by week and activities,  all the resource assigned to the project need to occuplied the budget, calculated by week/hours with rate, that will be consolidated to reflect if the project is overplan (exceed or shortfall).
   System should support manual or automatically assign the resource accordingly to the availability of the resource and approved budget.  allocation of the resource can not exceed 1 hcm (head count month) in each month or 144 hours among the projects.
   Resource allocation can be extracted into csv format for dowload.
4. Supply and Demand Dashboard
   System should show the dashboard of POD team's supply and Demand figure, breakdown by month among the projects budget and cost of resource.
