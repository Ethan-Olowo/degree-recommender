import torch.nn as nn
import torch
class DegreeRecommender(nn.Module):
    def __init__(self, cat_sizes, num_num_features, hidden_dim=128, num_classes=100):
        super().__init__()
        # Embeddings for categorical features
        self.emb_layers = nn.ModuleList([
            nn.Embedding(cat_size, min(50, (cat_size+1)//2)) for cat_size in cat_sizes
        ])
        emb_dim = sum([emb.embedding_dim for emb in self.emb_layers])

        self.fc1 = nn.Linear(emb_dim + num_num_features, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.out = nn.Linear(hidden_dim, num_classes)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)

    def forward(self, x_cat, x_num):
        embs = [emb(x_cat[:,i]) for i,emb in enumerate(self.emb_layers)]
        x = torch.cat(embs, dim=1)
        x = torch.cat([x, x_num], dim=1)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.relu(self.fc2(x))
        return self.out(x)