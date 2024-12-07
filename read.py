import os
from pathlib import Path
import mimetypes

def read_source_files(src_path='c:/Users/macle/Desktop/Work Helper/care-home-dashboard', exclude_dirs=None, include_extensions=None):
    """
    Read all code files from the specified source directory.
    
    Args:
        src_path (str): Path to the source directory
        exclude_dirs (list): List of directory names to exclude
        include_extensions (list): List of file extensions to include (e.g., ['.py', '.js'])
    
    Returns:
        dict: Dictionary with filepath as key and content as value
    """
    if exclude_dirs is None:
        exclude_dirs = [
            '.git', 'node_modules', '__pycache__', 'venv',
            'build', 'dist', 'coverage', '.next', '.cache',
            'lib', '.npm', '.yarn', 'bower_components',
            '.vscode', '.idea', '.vs'
        ]
    
    if include_extensions is None:
        include_extensions = [
            '.py', '.js', '.jsx', '.ts', '.tsx', 
            '.html', '.css', '.scss', '.sass',
            '.java', '.cpp', '.c', '.h', '.hpp',
            '.rb', '.php', '.go', '.rs', '.swift',
            '.json', '.yml', '.yaml', '.toml',
            '.md', '.env', '.gitignore', '.eslintrc',
            '.prettierrc', '.babelrc'
        ]
    
    code_files = {}
    src_path = Path(src_path).resolve()
    
    if not src_path.exists():
        raise FileNotFoundError(f"Source directory not found: {src_path}")
    
    for root, dirs, files in os.walk(src_path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        # Skip directories that contain package.json or similar module files
        for dir in dirs[:]:
            package_indicators = [
                Path(root) / dir / 'package.json',
                Path(root) / dir / 'setup.py',
                Path(root) / dir / 'requirements.txt',
                Path(root) / dir / 'Cargo.toml',
                Path(root) / dir / 'go.mod'
            ]
            if any(p.exists() for p in package_indicators):
                dirs.remove(dir)
        
        for file in files:
            file_path = Path(root) / file
            
            # Skip package management and lock files
            if file.lower() in [
                'package-lock.json', 'yarn.lock', 'poetry.lock',
                'pipfile.lock', 'cargo.lock', 'go.sum'
            ]:
                continue
            
            # Check if file extension should be included
            if file_path.suffix.lower() in include_extensions:
                try:
                    # Try to detect if it's a text file
                    mime_type, _ = mimetypes.guess_type(str(file_path))
                    if mime_type and not mime_type.startswith('text/'):
                        continue
                    
                    # Read file content
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Store relative path from src_path as key
                    relative_path = file_path.relative_to(src_path)
                    code_files[str(relative_path)] = content
                    
                except UnicodeDecodeError:
                    print(f"Warning: Could not read {file_path} as text file")
                except Exception as e:
                    print(f"Error reading {file_path}: {str(e)}")
    
    return code_files

def format_for_sharing(code_files):
    """
    Format the code files into a single string for sharing.
    """
    if not code_files:
        return "No code files found"
    
    formatted_text = []
    for filepath, content in sorted(code_files.items()):
        formatted_text.append(f"\n=== {filepath} ===\n")
        formatted_text.append(content)
        formatted_text.append("\n" + "=" * 80 + "\n")
    
    return "".join(formatted_text)

if __name__ == "__main__":
    try:
        # Read all code files
        code_files = read_source_files()
        
        # Format and save to output file
        formatted_output = format_for_sharing(code_files)
        
        output_file = "source_code_output.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(formatted_output)
            
        print(f"Successfully wrote code to {output_file}")
        print(f"Total files processed: {len(code_files)}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
