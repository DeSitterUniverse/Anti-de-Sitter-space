/** Skills data organized into categorized sections */
export interface SkillCategory {
  title: string;
  items: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    title: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Java", "C#", "C/C++", "SQL", "PowerShell", "Bash", "R"],
  },
  {
    title: "Data & Analytics",
    items: ["Snowflake", "Informatica Cloud", "Elasticsearch", "Oracle / SQL Server", "Qlik Enterprise Manager", "LanceDB", "Databricks", "SQLite", "Data Visualization", "Data Modeling", "Data Governance", "Statistical Analysis", "Tableau / Power BI", "CDC (Change Data Capture)", "RAG (Retrieval-Augmented Generation)"],
  },
  {
    title: "Backend & Infrastructure",
    items: ["Node.js", "REST APIs", "FastAPI", "Azure ADF / Synapse", "AWS", "GCP", "Kubernetes", "Docker", "Linux", "CI/CD", "Git"],
  },
  {
    title: "Frontend",
    items: ["React", "Angular", "HTML/CSS", "Tailwind CSS", "Astro", "jQuery"],
  },
  {
    title: "Automation & Tools",
    items: ["UiPath (RPA)", "Data Pipelines", "ETL/ELT", "Agentic AI", "Kibana", "ServiceNow", "SSMS / Oracle SQL Developer"],
  },
];
