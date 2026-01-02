import { supabase } from "./supabase";

export type Project = {
  id: string;
  name: string;
  created_at: string;
};

export type ProjectDocument = {
  id: string;
  project_id: string;
  document_type: string;
  document: unknown;
  created_at: string;
  updated_at: string;
};

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data || []) as Project[];
}

export async function createProject(name: string) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select("id,name,created_at")
    .single();
  if (error) {
    throw error;
  }
  return data as Project;
}

export async function renameProject(id: string, name: string) {
  const { data, error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", id)
    .select("id,name,created_at")
    .single();
  if (error) {
    throw error;
  }
  return data as Project;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function saveProjectDocument(
  projectId: string,
  document: unknown,
  documentType = "discovery"
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_documents")
    .upsert(
      {
        project_id: projectId,
        document_type: documentType,
        document,
        updated_at: now
      },
      { onConflict: "project_id,document_type" }
    )
    .select("id,project_id,document_type,document,created_at,updated_at")
    .single();
  if (error) {
    throw error;
  }
  return data as ProjectDocument;
}
